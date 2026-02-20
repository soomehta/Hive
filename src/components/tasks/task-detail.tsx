"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { formatDateTime, relativeDate } from "@/lib/utils/dates";
import { toast } from "sonner";
import type { Task, TaskComment } from "@/types";

interface TaskDetailProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

export function TaskDetail({ task, open, onClose }: TaskDetailProps) {
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();

  const { data: comments } = useQuery({
    queryKey: ["task-comments", task?.id],
    queryFn: async () => {
      const res = await apiClient(`/api/tasks/${task!.id}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json() as Promise<{ data: TaskComment[] }>;
    },
    enabled: !!task && open,
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiClient(`/api/tasks/${task!.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", task?.id] });
      setComment("");
      toast.success("Comment added");
    },
  });

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[480px] overflow-y-auto sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>{task.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{task.status.replace("_", " ")}</Badge>
            <Badge variant="secondary">{task.priority}</Badge>
            {task.isBlocked && <Badge variant="destructive">Blocked</Badge>}
          </div>

          {task.description && (
            <div>
              <h4 className="text-sm font-medium mb-1">Description</h4>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {task.dueDate && (
              <div>
                <span className="text-muted-foreground">Due:</span>{" "}
                {formatDateTime(task.dueDate)}
              </div>
            )}
            {task.estimatedMinutes && (
              <div>
                <span className="text-muted-foreground">Estimate:</span>{" "}
                {task.estimatedMinutes}m
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Created:</span>{" "}
              {relativeDate(task.createdAt)}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">
              Comments ({comments?.data?.length ?? 0})
            </h4>
            <div className="space-y-3">
              {comments?.data?.map((c) => (
                <div key={c.id} className="rounded-lg bg-muted p-3">
                  <p className="text-sm">{c.content}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {relativeDate(c.createdAt)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <Textarea
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => comment.trim() && addComment.mutate(comment)}
                disabled={!comment.trim() || addComment.isPending}
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
