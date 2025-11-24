import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import pLimit from "p-limit";
// import { getEmbeddings } from "./gemini";
// import { getSummary } from "./openai";
import { exit } from "process";
import { db } from "@/server/db";
import { Octokit } from "octokit";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSummary } from "./gemini";



const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_2!);
const getEmbeddings = async (text: string) => {
    // For embeddings, use the Text Embeddings model
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    const result = await model.embedContent(text);
    const embedding = result.embedding;
    console.log("native embedding function called: " ,embedding.values.length);
    return embedding.values as number[];
}


const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getFileCount = async (
  path: string,
  octokit: Octokit,
  githubOwner: string,
  githubRepo: string,
  acc: number = 0,
) => {
  const { data } = await octokit.rest.repos.getContent({
    owner: githubOwner,
    repo: githubRepo,
    path: path,
  });

  if (!Array.isArray(data) && data.type === "file") {
    return acc + 1;
  }

  if (Array.isArray(data)) {
    let fileCount = 0;
    const directories: string[] = [];

    // Count files and collect directories in current level
    for (const item of data) {
      if (item.type === "dir") {
        directories.push(item.path);
      } else {
        fileCount += 1;
      }
    }

    // Process all directories at this level in parallel
    if (directories.length > 0) {
      const directoryCounts = await Promise.all(
        directories.map((dirPath) =>
          getFileCount(dirPath, octokit, githubOwner, githubRepo, 0),
        ),
      );
      fileCount += directoryCounts.reduce((sum, count) => sum + count, 0);
    }

    return acc + fileCount;
  }

  return acc;
};

export const checkCredits = async (githubUrl: string, githubToken?: string) => {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
  const githubOwner = githubUrl.split("/")[3];
  const githubRepo = githubUrl.split("/")[4];
  if (!githubOwner || !githubRepo) return 0;
  const fileCount = await getFileCount("", octokit, githubOwner, githubRepo, 0);
  return fileCount;
};

export const loadGithubRepo = async (
  githubUrl: string,
  githubToken?: string,
) => {
  const loader = new GithubRepoLoader(githubUrl, {
    branch: "main",
    ignoreFiles: ["package-lock.json", "bun.lockb"],
    recursive: true,
    // recursive: false,
    accessToken: githubToken || "",
    unknown: "warn",
    maxConcurrency: 5, // Defaults to 2
  });
  const docs = await loader.load();
  return docs;
};

export const indexGithubRepo = async (
  projectId: string,
  githubUrl: string,
  githubToken?: string,
) => {
  const docs = await loadGithubRepo(githubUrl, githubToken);
  const allEmbeddings = await generateEmbeddings(docs);

    console.log("repo ke files ke embeddings generate hogai and length: ", allEmbeddings.length);

  const limit = pLimit(10);


  await Promise.allSettled(
    allEmbeddings.map((embedding, index) =>
      limit(async () => {
        console.log(`processing ${index} of ${allEmbeddings.length}`);
        if (!embedding) throw new Error("embedding is null");

        // First, upsert the basic data
        const sourceCodeEmbedding = await db.sourceCodeEmbedding.upsert({
          where: {
            projectId_fileName: {
              projectId,
              fileName: embedding.fileName,
            },
          },
          update: {
            summary: embedding.summary,
            sourceCode: embedding.sourceCode,
          },
          create: {
            summary: embedding.summary,
            sourceCode: embedding.sourceCode,
            fileName: embedding.fileName,
            projectId,
          },
        });

        // Then, update the summaryEmbedding using raw SQL
        await db.$executeRaw`
                UPDATE "SourceCodeEmbedding"
                SET "summaryEmbedding" = ${embedding.embeddings}::vector
                WHERE id = ${sourceCodeEmbedding.id}
            `;
      }),
    ),
  ).then(() => {
    console.log("All embeddings processed and stored.");
  }).catch((err) => {
        console.error("Error processing embeddings: ", err);
        exit(1);
    });
};

async function generateEmbeddings(docs: Awaited<ReturnType<typeof loadGithubRepo>>) {
    // IMPORTANT: Set limit to 1 for Free Tier (Gemini limit is ~15 RPM)
    const limit = pLimit(1); 

    return await Promise.all(docs.map((doc) => 
        limit(async () => {
            try {
                console.log(`Generative AI processing: ${doc.metadata.source}`);
                
                // Call 1: Summary
                const summary = await getSummary(doc);
                if (!summary) return null;



                // Call 2: Embedding
                const embeddings = await getEmbeddings(summary);

                // CRITICAL: Wait 0.8 seconds between every file to avoid 429 Errors
                await delay(800); 

                return {
                    summary,
                    embeddings,
                    sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
                    fileName: doc.metadata.source,
                };
            } catch (error) {
                console.error(`Error processing ${doc.metadata.source}:`, error);
                return null;
            }
        })
    ));
}
// console.log("done")

// const query = 'what env is needed for this project?'

// const embedding = await getEmbeddings(query)
// const vectorQuery = `[${embedding.join(',')}]`

// const result = await db.$queryRaw`
//   SELECT
//     id,
//     summary,
//     1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) as similarity
//   FROM "SourceCodeEmbedding"
//   where 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) > .5
//   ORDER BY  similarity DESC
//   LIMIT 10;
// `
// console.log(result)
