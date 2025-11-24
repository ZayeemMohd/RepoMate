"use client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import useProject from "@/hooks/use-project";
import { api } from "@/trpc/react";
import MDEditor from "@uiw/react-md-editor";
import React from "react";
import CodeReferences from "../dashboard/code-references";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import AskQuestionCard from "../dashboard/ask-question-card";

const QuestionList = () => {
  const { projectId } = useProject();
  const { data: questions, isLoading } = api.question.getAllQuestions.useQuery({
    projectId,
  });
  const [questionIdx, setQuestionIdx] = React.useState(0);
  const question = questions?.[questionIdx];
  if (isLoading) {
    return (
      <div>
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  return (
    <Sheet>
      <AskQuestionCard />
      <div className="h-4"></div>
      <h1 className="text-xl font-semibold text-gray-800">Saved Questions</h1>
      <div className="h-2"></div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-1">
        {questions?.map((question, idx) => (
          <React.Fragment key={question.id}>
            <SheetTrigger onClick={() => setQuestionIdx(idx)}>
              <div className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow">
                <Image
                  src={question.user.imageUrl || "/default-avatar.png"}
                  alt="Avatar"
                  width={30}
                  height={30}
                  className="rounded-full"
                />

                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <p className="line-clamp-1 text-lg font-medium text-gray-700">
                      {question.question}
                    </p>
                    <span className="whitespace-nowrap text-xs text-gray-400">
                      {formatDistanceToNow(question.createdAt, {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="line-clamp-1 text-sm text-gray-500">
                    {question.answer}
                  </p>
                </div>
              </div>
            </SheetTrigger>
          </React.Fragment>
        ))}
      </div>
      {question && (
        <SheetContent className="sm:max-w-[80vw]">
          <SheetHeader>
            <SheetTitle>{question.question}</SheetTitle>
            <MDEditor.Markdown
              source={question.answer}
              className="custom-ref !h-full max-h-[50vh] w-full flex-1 overflow-scroll"
            />
            <CodeReferences
              filesReferenced={(question.filesReferenced ?? []) as any}
            />
          </SheetHeader>
        </SheetContent>
      )}
    </Sheet>
  );
};

export default QuestionList;
