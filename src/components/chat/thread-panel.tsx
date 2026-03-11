"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/time";

export type ThreadMessage = {
  id: string;
  content: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
};

interface ThreadPanelProps {
  rootMessageContent: string | undefined;
  threadMessages: ThreadMessage[];
  onSendReply: (content: string) => void;
  isSending: boolean;
  onClose: () => void;
}

export function ThreadPanel({
  rootMessageContent,
  threadMessages,
  onSendReply,
  isSending,
  onClose,
}: ThreadPanelProps) {
  const [replyText, setReplyText] = useState("");

  return (
    <Card className="w-80 shrink-0">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">Thread</CardTitle>
        <Button size="icon" variant="ghost" className="size-6" onClick={onClose}>
          <X className="size-3" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {rootMessageContent && (
          <div className="rounded-md border bg-muted/30 p-2">
            <p className="text-sm font-medium break-words">{rootMessageContent}</p>
          </div>
        )}

        <div className="max-h-[300px] space-y-2 overflow-y-auto">
          {threadMessages.length === 0 ? (
            <p className="text-xs text-muted-foreground">No replies yet.</p>
          ) : (
            threadMessages.map((tm) => (
              <div key={tm.id} className="rounded-md border bg-background p-2">
                <p className="text-xs font-medium mb-0.5">{tm.authorName ?? tm.authorId.slice(0, 8)}</p>
                <p className="text-sm break-words">{tm.content}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(tm.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <Textarea
            rows={2}
            placeholder="Reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && replyText.trim()) {
                e.preventDefault();
                onSendReply(replyText.trim());
                setReplyText("");
              }
            }}
          />
          <Button
            size="sm"
            disabled={!replyText.trim() || isSending}
            onClick={() => {
              onSendReply(replyText.trim());
              setReplyText("");
            }}
          >
            Reply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
