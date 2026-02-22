"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { relativeDate } from "@/lib/utils/dates";
import { getUserInitials, getUserDisplayName } from "@/lib/utils/user-display";
import type { WidgetProps } from "@/types/bees";
import type { Message } from "@/types";
import { MessageSquare } from "lucide-react";

const AVATAR_PALETTE = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

export function ChatWidget({ orgId, projectId, isEditing }: WidgetProps) {
  const { data: messages, isLoading } = useQuery({
    queryKey: ["widget-messages", orgId, projectId],
    queryFn: async () => {
      const res = await apiClient(
        `/api/messages?projectId=${projectId}&limit=10`
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      const json = await res.json();
      return json.data as Message[];
    },
    enabled: !!orgId && !!projectId,
    refetchInterval: 20_000,
  });

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Select a project to view messages</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <Skeleton className="mt-0.5 h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No messages yet in this project</p>
        </div>
      </div>
    );
  }

  // Show newest messages at bottom (reverse chronological order, reversed for display)
  const ordered = [...messages].reverse();

  return (
    <div
      className={`flex h-full flex-col overflow-hidden ${
        isEditing ? "pointer-events-none select-none" : ""
      }`}
    >
      <div className="flex-1 space-y-0 divide-y overflow-y-auto">
        {ordered.map((msg, idx) => {
          const displayName = getUserDisplayName({ userId: msg.userId });
          const initials = getUserInitials(displayName);
          const avatarClass = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];

          return (
            <div key={msg.id} className="flex items-start gap-2.5 px-3 py-2.5">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarClass}`}
                aria-label={displayName}
              >
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[11px] font-semibold">{displayName}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {relativeDate(msg.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-foreground/80">
                  {msg.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
