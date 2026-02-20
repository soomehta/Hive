"use client";

import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ReportChatProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

export function ReportChat({ messages, isLoading }: ReportChatProps) {
  return (
    <div className="flex flex-col gap-4 py-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex gap-3 px-4",
            message.role === "user" ? "flex-row-reverse" : "flex-row"
          )}
        >
          {/* Avatar */}
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {message.role === "user" ? (
              <User className="size-4" />
            ) : (
              <Bot className="size-4" />
            )}
          </div>

          {/* Message bubble */}
          <div
            className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3",
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            )}
          >
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              <FormattedText text={message.content} />
            </div>
            <p
              className={cn(
                "mt-1 text-[10px]",
                message.role === "user"
                  ? "text-primary-foreground/60"
                  : "text-muted-foreground"
              )}
            >
              {message.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex gap-3 px-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Bot className="size-4" />
          </div>
          <div className="rounded-2xl bg-muted px-4 py-3">
            <div className="flex items-center gap-1">
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Formatted Text (basic markdown-like rendering) ──

function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, i) => {
        // Heading: ## or ###
        if (line.startsWith("### ")) {
          return (
            <h4 key={i} className="mt-3 mb-1 text-sm font-semibold">
              {line.slice(4)}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className="mt-3 mb-1 text-base font-semibold">
              {line.slice(3)}
            </h3>
          );
        }

        // Bullet points
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2 pl-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current opacity-40" />
              <span>
                <InlineFormatted text={line.slice(2)} />
              </span>
            </div>
          );
        }

        // Numbered list
        const numberedMatch = line.match(/^(\d+)\.\s(.+)$/);
        if (numberedMatch) {
          return (
            <div key={i} className="flex gap-2 pl-2">
              <span className="shrink-0 font-medium opacity-60">
                {numberedMatch[1]}.
              </span>
              <span>
                <InlineFormatted text={numberedMatch[2]} />
              </span>
            </div>
          );
        }

        // Empty line
        if (line.trim() === "") {
          return <div key={i} className="h-2" />;
        }

        // Regular paragraph
        return (
          <p key={i}>
            <InlineFormatted text={line} />
          </p>
        );
      })}
    </>
  );
}

function InlineFormatted({ text }: { text: string }) {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
