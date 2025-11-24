"use client";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
// @ts-ignore: side-effect import of CSS without type declarations
import "react-circular-progressbar/dist/styles.css";
import axios from "axios";
import { PlusIcon, Presentation, Upload } from "lucide-react";
import React from "react";
import { useDropzone } from "react-dropzone";
import { Project } from "@prisma/client";
import { uploadFileToFirebase } from "@/lib/storage";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import useProject from "@/hooks/use-project";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import useRefetch from "@/hooks/use-refetch";

const MeetingCard = () => {
  const [progress, setProgress] = React.useState(0);

  const uploadMeeting = api.project.uploadMeeting.useMutation();

  const processMeeting = useMutation({
    mutationFn: async (data: {
      audio_url: string;
      projectId: string;
      meetingId: string;
    }) => {
      const { audio_url, projectId, meetingId } = data;
      const response = await axios.post("/api/process-meeting", {
        audio_url,
        projectId,
        meetingId,
      });
      console.log("meeting processed sucessfully", response.data);
      return response.data;
    },
  });
  const refetch = useRefetch();
  const [isUploading, setIsUploading] = React.useState(false);

  const router = useRouter();
  const { project } = useProject();

  const { getRootProps, getInputProps } = useDropzone({
    // only accept audio files
    accept: {
      "audio/*":
        ".mp3,.m4a,.wav,.flac,.ogg,.aac,.opus,.wma,.amr,.3gp,.mp2,.m2a,.m4b,.m4p,.mpc,.mpga,.oga,.spx,.wv,.mka,.m3u,.m3u8,.m4u".split(
          ",",
        ),
      "video/*": ".mp4,.mov,.avi,.mkv,.webm,.flv,.3gp,.m4v".split(","),
    },
    multiple: false,
    onDragEnter: () => {
      console.log("drag enter");
    },
    onDragOver: () => {
      console.log("drag over");
    },
    onDragLeave: () => {
      console.log("drag leave");
    },
    // 50mb
    maxSize: 50000000,

    onDrop: async (acceptedFiles, fileRejections) => {
      console.log("on drop called", { acceptedFiles, fileRejections });
      //   console.log("the project: ", project);

      if (!project) {
        console.warn("No project available when dropping file");
        return;
      }
      setIsUploading(true);
      console.log("file is uploading...");
      if (!acceptedFiles || acceptedFiles.length === 0) {
        console.warn(
          "No accepted files - possible reject by accept/maxSize",
          fileRejections,
        );
        toast.error(
          "File not accepted. Please use an allowed file type and size.",
        );
        setIsUploading(false);
        return;
      }

      const file = acceptedFiles[0];

      console.log("file is", file);

      if (file instanceof File) {
        const downloadUrl = await uploadFileToFirebase(
          file,
          file.name,
          setProgress,
        );

        console.log("download url: ", downloadUrl);

        const meeting = await uploadMeeting.mutateAsync({
          audio_url: downloadUrl,
          name: file.name,
          projectId: project.id,
        });

        console.log("meeting is: ", meeting);

        refetch();
        console.log("refetch called and meeting uploaded successfully");

        router.push("/meetings");

        processMeeting.mutateAsync({
          audio_url: downloadUrl,
          projectId: project.id,
          meetingId: meeting.id,
        });
      }

      setIsUploading(false);
    },
  });

  return (
    <>
      <Card
        {...getRootProps()}
        className="col-span-2 flex flex-col items-center justify-center rounded-lg border bg-white p-10"
      >
        {!isUploading && (
          <>
            <Presentation className="h-10 w-10 animate-bounce" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              Create a new "Video Comment"
            </h3>
            <p className="mt-1 text-center text-sm text-gray-500">
              Analyse your "Video Comment" with RepoMate.
              <br />
              Powered by AI.
            </p>
            <div className="mt-6">
              <Button isLoading={isUploading}>
                <Upload className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                Upload "Video Comment"
                <input className="hidden" {...getInputProps()} />
              </Button>
            </div>
          </>
        )}
        {isUploading && (
          <div>
            <CircularProgressbar
              value={progress}
              text={`${Math.round(progress)}%`}
              className="size-20"
              styles={buildStyles({
                pathColor: "#2563eb",
                textColor: "#2563eb",
              })}
            />
            <p className="mt-3 text-center text-xs text-gray-500">
              Uploading and processing "Video Comment"... <br />
              This may take a few minutes...
            </p>
          </div>
        )}
      </Card>
    </>
  );
};

export default MeetingCard;
