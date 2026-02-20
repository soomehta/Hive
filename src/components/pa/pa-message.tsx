"use client";

import { cn } from "@/lib/utils";
import { Brain, User } from "lucide-react";

interface PAMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function PAMessage({ role, content }: PAMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-zinc-700" : "bg-violet-600/20"
        )}
      >
        {isUser ? (
          <User className="size-4 text-zinc-300" />
        ) : (
          <Brain className="size-4 text-violet-400" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3 py-2 text-sm",
          isUser
            ? "bg-violet-600 text-white"
            : "bg-zinc-800 text-zinc-200"
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
