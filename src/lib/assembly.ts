import { AssemblyAI } from "assemblyai";
import { readFileSync, writeFileSync } from "fs";
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY! || "c8b0f2a90af84c5f9c5b54fde224440a",
});

const FILE_URL = "https://assembly.ai/sports_injuries.mp3";

function msToTime(ms: number): string {
  const seconds = ms / 1000;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export const processMeeting = async (audio_url: string) => {
  console.log("processMeeting is called with the url: ", audio_url);

  const transcript = await client.transcripts.transcribe({
    audio: audio_url,
    auto_chapters: true,
    language_code: "en",
  });

  console.log("Transcript text: ", transcript.text);

  const summaries =
    transcript.chapters?.map((chapter) => ({
      start: msToTime(chapter.start),
      end: msToTime(chapter.end),
      gist: chapter.gist,
      headline: chapter.headline,
      summary: chapter.summary,
    })) || [];
  if (!transcript.text) {
    throw new Error("No transcript text");
  }

  console.log("summaries array length: ", summaries.length)

  return {
    transcript,
    summaries,
  };
};

// // processMeeting(FILE_URL);
// const fileUrl = "/Users/zayeemmohd/Downloads/lob.mp3";

// const transcript = await client.transcripts.transcribe({
//   // audio_url: fileUrl,
//   audio: readFileSync(fileUrl),
//   auto_chapters: true,
//   language_code: "en",
// });

// await writeFileSync("transcript.json", JSON.stringify(transcript, null, 2));

// const summaries = transcript.chapters?.map(chapter => ({
//     start: msToTime(chapter.start),
//     end: msToTime(chapter.end),
//     gist: chapter.gist,
//     headline: chapter.headline,
//     summary: chapter.summary
// })) || [];
