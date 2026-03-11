"use client";

import { useState } from "react";
import { MessageSquarePlus, Trash2, Pencil, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
      <div className="px-5 py-4">
        <button
          onClick={onNewChat}
          className="neu-flat flex w-full items-center justify-center gap-2 rounded-2xl bg-background px-4 py-2.5 text-sm text-muted-foreground transition-all hover:text-foreground active:neu-pressed"
        >
          <MessageSquarePlus className="size-4" />
          New conversation
        </button>
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteSession = useDeleteChatSession();
  const renameSession = useRenameChatSession();

  function handleRename() {
    if (editTitle.trim() && editTitle.trim() !== session.title) {
      renameSession.mutate({ sessionId: session.id, title: editTitle.trim() });
    }
    setIsEditing(false);
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  }

  function handleDeleteConfirm() {
    deleteSession.mutate(session.id);
    setShowDeleteConfirm(false);
  }

  const isMutating = deleteSession.isPending || renameSession.isPending;
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
      disabled={isMutating}
      className={cn(
        "group flex w-full items-center gap-2 rounded-2xl px-3.5 py-2.5 mx-1 my-1 text-left transition-all",
        isActive
          ? "neu-pressed bg-background text-foreground"
          : "neu-subtle bg-background text-muted-foreground hover:text-foreground",
        isMutating && "pointer-events-none opacity-50"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium" title={session.title}>{session.title}</p>
        <p className="text-xs text-muted-foreground">
          {session.messageCount} messages · {timeLabel}
        </p>
      </div>
      {isMutating ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
      ) : (
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
            onClick={handleDeleteClick}
            aria-label="Delete"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{session.title}&rdquo; and all its messages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
