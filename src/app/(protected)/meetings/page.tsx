"use client";
import useProject from "@/hooks/use-project";
import React from "react";
import MeetingCard from "../dashboard/meeting-card";
import { api } from "@/trpc/react";
import Link from "next/link";
import DeleteMeetingButton from "./delete-meeting-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import Image from "next/image";

const MeetingsPage = () => {
  const { project } = useProject();
  const { data: meetings, isLoading } = api.project.getAllMeetings.useQuery(
    { projectId: project?.id ?? "" },
    {
      refetchInterval: 4000,
    },
  );
  return (
    <>
      <MeetingCard />
      <div className="h-6"></div>
      <h1 className="text-xl font-semibold text-gray-800">
        All "Video Comments"
      </h1>
      {meetings && meetings.length === 0 && (
        <div className="text-sm text-gray-500">No "Video Comment" yet</div>
      )}
      {isLoading && (
        <div className="mt-4">
          <Loader2 className="animate-spin" />
        </div>
      )}
      <ul role="list" className="divide-y divide-gray-200">
        {meetings?.map((meeting) => (
          <li
            key={meeting.id}
            className="flex items-center justify-between gap-x-6 py-5"
          >
            <div className="flex items-center gap-2">
              {meeting.createdBy && (
                <Image
                  src={meeting.createdBy.imageUrl || "/default-avatar.png"}
                  alt="Avatar"
                  width={30}
                  height={30}
                  className="rounded-full"
                />
              )}
              <div>
                <div className="min-w-0">
                  <div className="flex items-center gap-x-3">
                    <Link
                      aria-disabled={meeting.status === "PROCESSING"}
                      href={`/meeting/${meeting.id}`}
                      className={cn(
                        "text-sm font-semibold leading-6 text-gray-900 hover:underline",
                        meeting.status === "PROCESSING" &&
                          "pointer-events-none cursor-not-allowed opacity-50",
                      )}
                    >
                      {meeting.name}
                    </Link>
                    {meeting.status === "PROCESSING" && (
                      <Badge className="bg-yellow-500 text-white">
                        Processing{" "}
                        <Loader2 className="ml-1 size-3 animate-spin" />
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-x-2 text-xs leading-5 text-gray-500">
                  <p className="whitespace-nowrap">
                    <time dateTime={meeting.createdAt.toLocaleDateString()}>
                      {meeting.createdAt.toLocaleDateString()}
                    </time>
                  </p>
                  <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                    <circle cx={1} cy={1} r={1} />
                  </svg>
                  <p className="truncate">
                    {meeting.issues.length}{" "}
                    {meeting.issues.length === 1 ? "change" : "changes"}{" "}
                    detected
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-none items-center gap-x-4">
              <Link
                aria-disabled={meeting.status === "PROCESSING"}
                href={`/meeting/${meeting.id}`}
                className={cn(
                  "hidden rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:block",
                  meeting.status === "PROCESSING" &&
                    "pointer-events-none cursor-not-allowed opacity-50",
                )}
              >
                View "Video Comment"
              </Link>
              <DeleteMeetingButton meetingId={meeting.id} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
};

export default MeetingsPage;
