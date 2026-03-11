"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Brain, User } from "lucide-react";
import { type ReactNode } from "react";

interface PAMessageProps {
  role: "user" | "assistant";
  content: string;
  isTranscribing?: boolean;
  isStreaming?: boolean;
}

/**
 * Convert deep links in text to clickable Next.js links.
 * Matches /dashboard/... paths and [Title](/path) markdown-style links.
 */
function linkifyContent(text: string): ReactNode[] {
  // Match markdown links [text](/path) and bare /dashboard/... paths
  const pattern = /\[([^\]]+)\]\((\/dashboard\/[^\s)]+)\)|(\/dashboard\/[^\s,.)]+)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
      // Markdown-style [text](/path)
      parts.push(
        <Link key={match.index} href={match[2]} className="text-primary underline hover:text-primary/80">
          {match[1]}
        </Link>
      );
    } else if (match[3]) {
      // Bare path /dashboard/...
      parts.push(
        <Link key={match.index} href={match[3]} className="text-primary underline hover:text-primary/80">
          {match[3]}
        </Link>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function PAMessage({ role, content, isTranscribing, isStreaming }: PAMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "neu-subtle flex size-8 shrink-0 items-center justify-center rounded-xl bg-background",
        )}
      >
        {isUser ? (
          <User className="size-4 text-muted-foreground" />
        ) : (
          <Brain className="size-4 text-muted-foreground" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "neu-pressed bg-background text-foreground"
            : "neu-subtle bg-background text-foreground",
          isTranscribing && "animate-pulse"
        )}
      >
        <p className="whitespace-pre-wrap">
          {linkifyContent(content)}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground" />
          )}
        </p>
      </div>
    </div>
  );
}
