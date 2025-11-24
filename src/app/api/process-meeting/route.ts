import { processMeeting } from "@/lib/assembly";
// import { getEmbeddings } from "@/lib/gemini";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import pLimit from "p-limit";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 300; // 5 minutes

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_2!);

export const getEmbeddings = async (text: string) => {
    // For embeddings, use the Text Embeddings model
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    const result = await model.embedContent(text);
    const embedding = result.embedding;
    console.log("native embedding function called: " ,embedding.values.length);
    return embedding.values as number[];
}

const bodyParser = z.object({
    audio_url: z.string(),
    projectId: z.string(),
    meetingId: z.string()
})

export async function POST(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
        const body = await req.json();
        const { audio_url, projectId, meetingId } = bodyParser.parse(body);
        // get the transcript and summaries
        const { transcript, summaries } = await processMeeting(audio_url);

        console.log("Transcript text: ", transcript.text);
        console.log("summaries array length: ", summaries.length);

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 800,
            chunkOverlap: 130
        })
        // create documents from the transcript
        const docs = await splitter.createDocuments([transcript.text!])
        // get the embeddings
        const embeddings = await Promise.all(docs.map(async (doc) => {
            const embedding = await getEmbeddings(doc.pageContent)
            return { embedding, content: doc.pageContent }
        }))

        const limit = pLimit(10);
        // save the embeddings
        await Promise.all(embeddings.map(async (embedding, index) => {
            limit(async () => {
                const meetingEmbedding = await db.meetingEmbedding.create({
                    data: {
                        meetingId,
                        content: embedding.content
                    }
                })

    await db.$executeRaw`
        UPDATE "MeetingEmbedding"
        SET "embedding" = ${embedding.embedding}::vector
        WHERE id = ${meetingEmbedding.id}`;

            })
        }))

        // save the issues
        await db.issue.createMany({
            data: summaries.map((summary) => ({
                start: summary.start,
                end: summary.end,
                gist: summary.gist,
                headline: summary.headline,
                summary: summary.summary,
                meetingId,
            })),
        });


        await db.meeting.update({
            where: { id: meetingId },
            data: {
                status: "COMPLETED",
                name: summaries[0]?.gist || "Untitled Video Comment"
            },
        });
        

        return NextResponse.json({ meetingId }, { status: 200 })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 })
        }

        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}