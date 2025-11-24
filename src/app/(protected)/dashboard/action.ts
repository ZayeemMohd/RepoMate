"use server";

import { streamText } from "ai";
import { createStreamableValue } from "ai/rsc";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getEmbeddings } from "@/lib/gemini";
import { db } from "@/server/db";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY_4
});

export async function generate(input: string, projectId: string) {

    console.log("input (query form user which is converted to embedding vector) is: ", input, "projectId is: ", projectId);

  const stream = createStreamableValue("");

  const embedding = await getEmbeddings(input);
  console.log("Emberdding are generated for input question: ", embedding.length);


  const vectorQuery = `[${embedding.join(",")}]`;


  // db me se fetch karne ki koshish kar rahe hain jo similar files hain iss query ke hisaab se
  const result = (await db.$queryRaw`SELECT "fileName", "sourceCode", summary, 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) as similarity FROM "SourceCodeEmbedding" WHERE 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) > 0.5 AND "projectId" = ${projectId} ORDER BY similarity DESC LIMIT 10;`) as { fileName: string; sourceCode: string; summary: string }[];

    console.log("result after embedings and db query to get similar files: ", result.length);

  let context = "";

  for (const r of result) {
    context += `source:${r.fileName}\ncode content:${r.sourceCode}\nsummary of file:${r.summary}\n\n`;
  }

  console.log("context is: {Z ",context, "Z}");

  (async () => {
    const { textStream } = await streamText({
      model: google("gemini-2.0-flash-lite"),
      prompt: `
            You are a ai code assistant who answers questions about the codebase. Your target audience is a technical intern who is looking to understand the codebase.
                    AI assistant is a brand new, powerful, human-like artificial intelligence.
      The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
      AI is a well-behaved and well-mannered individual.
      AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
      AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
      If the question is asking about code or a specific file, AI will provide the detailed answer, giving step by step instructions, including code snippets.
      START CONTEXT BLOCK
      ${context}
      END OF CONTEXT BLOCK

      START QUESTION
      ${input}
      END OF QUESTION
      AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
      If the context does not provide the answer to question, the AI assistant will say, "I'm sorry, but I don't know the answer to that question".
      AI assistant will not apologize for previous responses, but instead will indicated new information was gained.
      AI assistant will not invent anything that is not drawn directly from the context.
      Answer in markdown syntax, with code snippets if needed. Be as detailed as possible when answering, make sure there is no ambiguity and include any and all relevant information to give context to the intern.
            `,
    });

    for await (const delta of textStream) {
      stream.update(delta);
    }

    stream.done();
  })();

  console.log(
    "response generated successfully using gemini model using streamText.",
  );
  return { output: stream.value, filesReferenced: result };
}


// context is:  source:new_file.txt
// code content:"this is my new file" 

// summary of file:Alright, welcome! Let's take a look at this `new_file.txt`. Essentially, this is a very simple text file.  It's purpose is to act as a placeholder or a starting point for something new.  Currently, it just contains a single line: "this is my new file".  Think of it as a blank canvas, ready for you or me to add to it. We might use it for initial notes, brief descriptions of a feature, or perhaps a temporary storage location before integrating code. It really just depends on the specific project.


// source:product.txt
// code content:This is my first product 

// summary of file:Okay, welcome aboard! Let's get you acquainted with the project and, in particular, this `product.txt` file.

// As you can see, this is a very straightforward and simple file.  It's a placeholder, likely used as an introductory element. It essentially states: "This is my first product."  

// Think of it as a starting point. It's likely we'll be replacing this with more details about the product. Its main purpose, in this simple state, is to establish that the project is about a product and gives us a starting point. It might be used for generating documentation, serving as a title, or as a starting point for more detail. We'll flesh it out as we progress.

// Basically, the file currently serves as a very basic identifier. Any questions?

