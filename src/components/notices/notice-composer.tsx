"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PlusSquare, Calendar } from "lucide-react";

export interface NoticePayload {
  title: string;
  body: string;
  status: "active" | "scheduled";
  isPinned: boolean;
  startsAt?: string;
  expiresAt?: string;
}

interface NoticeComposerProps {
  onSubmit: (payload: NoticePayload) => void;
  isSubmitting: boolean;
}

export function NoticeComposer({ onSubmit, isSubmitting }: NoticeComposerProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [noticeStatus, setNoticeStatus] = useState<"active" | "scheduled">("active");
  const [isPinned, setIsPinned] = useState(false);

  const handleSubmit = () => {
    const payload: NoticePayload = {
      title: title.trim(),
      body: body.trim(),
      status: noticeStatus,
      isPinned,
    };
    if (startsAt) payload.startsAt = new Date(startsAt).toISOString();
    if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString();
    onSubmit(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <PlusSquare className="size-4" />
          Post Notice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Notice title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          rows={4}
          placeholder="Write notice details..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3" /> Starts at (optional)
            </label>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3" /> Expires at (optional)
            </label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <select
              className="rounded-md border bg-background px-2 py-1 text-sm"
              value={noticeStatus}
              onChange={(e) => setNoticeStatus(e.target.value as "active" | "scheduled")}
            >
              <option value="active">Publish now</option>
              <option value="scheduled">Schedule</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded border"
            />
            Pin immediately
          </label>
        </div>

        <Button
          disabled={!title.trim() || !body.trim() || isSubmitting}
          onClick={handleSubmit}
        >
          Publish Notice
        </Button>
      </CardContent>
    </Card>
  );
}
