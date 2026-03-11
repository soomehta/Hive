"use client";

import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentMessageProps {
  message: {
    id: string;
    content: string;
    createdAt: string | Date;
    agentMetadata?: {
      agentName?: string;
      agentType?: string;
      avatarUrl?: string;
      checkinId?: string;
    };
  };
  children?: React.ReactNode;
}

export function AgentMessage({ message, children }: AgentMessageProps) {
  const agentName = message.agentMetadata?.agentName ?? "Hive Agent";
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex gap-3 py-3">
      {/* Agent avatar */}
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          "bg-purple-100 text-purple-600",
          "dark:bg-purple-900/30 dark:text-purple-400"
        )}
        aria-hidden="true"
      >
        <Bot className="size-4" />
      </div>

      <div className="flex-1 space-y-1">
        {/* Header row: agent name, type badge, timestamp */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
            {agentName}
          </span>

          {message.agentMetadata?.agentType && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                "bg-purple-100 text-purple-700",
                "dark:bg-purple-900/30 dark:text-purple-300"
              )}
            >
              {message.agentMetadata.agentType}
            </span>
          )}

          <span className="text-xs text-muted-foreground">{time}</span>
        </div>

        {/* Message bubble — distinct purple tint to separate from human messages */}
        <div
          className={cn(
            "rounded-lg border p-3 text-sm",
            "border-purple-200/50 bg-purple-50/50",
            "dark:border-purple-800/30 dark:bg-purple-950/20"
          )}
        >
          {message.content}
        </div>

        {/* Optional slot: action buttons, reactions, etc. */}
        {children}
      </div>
    </div>
  );
}
