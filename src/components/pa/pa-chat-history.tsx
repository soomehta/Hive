"use client";

import { useState } from "react";
import { MessageSquarePlus, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useChatSessions,
  useDeleteChatSession,
  useRenameChatSession,
  type ChatSession,
} from "@/hooks/use-pa";
import { cn } from "@/lib/utils";

interface PAChatHistoryProps {
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
}

export function PAChatHistory({ activeSessionId, onSelectSession, onNewChat }: PAChatHistoryProps) {
  const { data: sessions, isLoading } = useChatSessions();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="px-4 py-3">
        <Button
          onClick={onNewChat}
          variant="outline"
          className="w-full gap-2 text-sm"
        >
          <MessageSquarePlus className="size-4" />
          New conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Loading conversations...
          </div>
        )}

        {!isLoading && (!sessions || sessions.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <p>No conversations yet</p>
            <p className="text-xs">Start a new chat to begin</p>
          </div>
        )}

        {sessions?.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            onSelect={() => onSelectSession(session.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SessionRow({
  session,
  isActive,
  onSelect,
}: {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);
  const deleteSession = useDeleteChatSession();
  const renameSession = useRenameChatSession();

  function handleRename() {
    if (editTitle.trim() && editTitle.trim() !== session.title) {
      renameSession.mutate({ sessionId: session.id, title: editTitle.trim() });
    }
    setIsEditing(false);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    deleteSession.mutate(session.id);
  }

  const timeLabel = formatRelativeTime(session.lastMessageAt);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 rounded-lg border border-violet-500/50 px-3 py-2 mx-1 my-1">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") setIsEditing(false);
          }}
          className="flex-1 bg-transparent text-sm text-foreground outline-none"
          autoFocus
        />
        <Button variant="ghost" size="icon" className="size-6" onClick={handleRename}>
          <Check className="size-3" />
        </Button>
        <Button variant="ghost" size="icon" className="size-6" onClick={() => setIsEditing(false)}>
          <X className="size-3" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 mx-1 my-0.5 text-left transition-colors",
        isActive
          ? "bg-violet-500/10 text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{session.title}</p>
        <p className="text-xs text-muted-foreground">
          {session.messageCount} messages · {timeLabel}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            setEditTitle(session.title);
            setIsEditing(true);
          }}
          aria-label="Rename"
        >
          <Pencil className="size-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          aria-label="Delete"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </button>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
