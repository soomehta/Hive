"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import {
  MessageSquare,
  Activity,
  ListTodo,
  Send,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TASK_STATUSES, TASK_PRIORITIES, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/lib/utils/constants";
import { relativeDate } from "@/lib/utils/dates";
import { getActivityDescription } from "@/lib/utils/activity-descriptions";
import { getUserDisplayName } from "@/lib/utils/user-display";
import type { Task, TaskComment, ActivityLogEntry } from "@/types";
import { toast } from "sonner";

interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  joinedAt: string;
}

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  projectId: string;
  members: ProjectMember[] | undefined;
  onOpenChange: (open: boolean) => void;
  onUpdate: (taskId: string, data: Record<string, unknown>) => void;
  onDelete: (taskId: string) => void;
  isUpdating: boolean;
  isDeleting: boolean;
  onNavigateToSubtask: (task: Task) => void;
}

export function TaskDetailSheet({
  task,
  open,
  projectId,
  members,
  onOpenChange,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
  onNavigateToSubtask,
}: TaskDetailSheetProps) {
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");

  // Comments
  const { data: comments } = useQuery({
    queryKey: ["task-comments", task?.id],
    queryFn: async () => {
      const res = await apiClient(`/api/tasks/${task!.id}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      const json = await res.json();
      return json.data as TaskComment[];
    },
    enabled: !!task && open,
  });

  // Activity
  const { data: taskActivity } = useQuery({
    queryKey: ["task-activity", task?.id],
    queryFn: async () => {
      const res = await apiClient(`/api/activity?taskId=${task!.id}&limit=20`);
      if (!res.ok) throw new Error("Failed to fetch activity");
      const json = await res.json();
      return json.data as ActivityLogEntry[];
    },
    enabled: !!task && open,
  });

  // Subtasks
  const { data: subtasks } = useQuery({
    queryKey: ["task-subtasks", task?.id],
    queryFn: async () => {
      const res = await apiClient(`/api/tasks/${task!.id}/subtasks`);
      if (!res.ok) throw new Error("Failed to fetch subtasks");
      const json = await res.json();
      return json.data as Task[];
    },
    enabled: !!task && open,
  });

  const addCommentMutation = useMutation({
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
      setCommentText("");
      toast.success("Comment added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add comment");
    },
  });

  const addSubtaskMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiClient("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          title,
          status: "todo",
          priority: "medium",
          parentTaskId: task!.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to create subtask");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-subtasks", task?.id] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      setSubtaskTitle("");
      toast.success("Subtask created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create subtask");
    },
  });

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{task.title}</SheetTitle>
          <SheetDescription>Task details</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <Separator />

          {/* Status selector */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-muted-foreground">Status</Label>
            <Select
              value={task.status}
              onValueChange={(value) => onUpdate(task.id, { status: value })}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {TASK_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority selector */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
            <Select
              value={task.priority}
              onValueChange={(value) => onUpdate(task.id, { priority: value })}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {TASK_PRIORITY_LABELS[priority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee selector */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-muted-foreground">Assignee</Label>
            <Select
              value={task.assigneeId ?? "unassigned"}
              onValueChange={(value) =>
                onUpdate(task.id, { assigneeId: value === "unassigned" ? null : value })
              }
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members?.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {getUserDisplayName({ userId: member.userId })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due date input */}
          <div className="space-y-1.5">
            <Label
              htmlFor="detail-due-date"
              className="text-sm font-medium text-muted-foreground"
            >
              Due Date
            </Label>
            <Input
              id="detail-due-date"
              type="date"
              defaultValue={
                task.dueDate
                  ? new Date(task.dueDate).toISOString().split("T")[0]
                  : ""
              }
              onBlur={(e) => {
                const value = e.target.value;
                const newDate = value ? new Date(value).toISOString() : null;
                if (newDate !== task.dueDate) {
                  onUpdate(task.id, { dueDate: newDate });
                }
              }}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          {/* Description */}
          {task.description && (
            <div>
              <h4 className="mb-1 text-sm font-medium text-muted-foreground">Description</h4>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Estimate */}
          {task.estimatedMinutes && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Estimate</h4>
              <p className="text-sm">
                {task.estimatedMinutes >= 60
                  ? `${Math.floor(task.estimatedMinutes / 60)}h ${task.estimatedMinutes % 60 > 0 ? `${task.estimatedMinutes % 60}m` : ""}`
                  : `${task.estimatedMinutes}m`}
                {" "}({task.estimatedMinutes} min)
              </p>
            </div>
          )}

          <Separator />

          {/* Comments & Activity Tabs */}
          <Tabs defaultValue="comments">
            <TabsList className="w-full">
              <TabsTrigger value="comments" className="flex-1 gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Comments ({comments?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex-1 gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="space-y-3 mt-3">
              {comments && comments.length > 0 ? (
                <div className="space-y-2">
                  {comments.map((c) => (
                    <div key={c.id} className="rounded-lg bg-muted p-3">
                      <p className="text-sm">{c.content}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {relativeDate(c.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No comments yet.</p>
              )}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  className="self-end"
                  onClick={() => commentText.trim() && addCommentMutation.mutate(commentText.trim())}
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-3">
              {taskActivity && taskActivity.length > 0 ? (
                <div className="space-y-2">
                  {taskActivity.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2 py-1.5">
                      <Activity className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm">
                          {getActivityDescription(
                            entry.type as Parameters<typeof getActivityDescription>[0],
                            entry.metadata as Parameters<typeof getActivityDescription>[1]
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {relativeDate(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No activity yet.</p>
              )}
            </TabsContent>
          </Tabs>

          {/* Subtasks */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <ListTodo className="h-3.5 w-3.5" />
              Subtasks {subtasks && subtasks.length > 0 && `(${subtasks.length})`}
            </h4>
            {subtasks && subtasks.length > 0 && (
              <div className="space-y-1">
                {subtasks.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/50 transition-colors"
                    onClick={() => {
                      setCommentText("");
                      setSubtaskTitle("");
                      onNavigateToSubtask(st);
                    }}
                  >
                    <div
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        st.status === "done"
                          ? "bg-green-500"
                          : st.status === "in_progress"
                            ? "bg-blue-500"
                            : "bg-gray-400"
                      }`}
                    />
                    <span className={st.status === "done" ? "line-through text-muted-foreground" : ""}>
                      {st.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Add subtask..."
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && subtaskTitle.trim()) {
                    addSubtaskMutation.mutate(subtaskTitle.trim());
                  }
                }}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => subtaskTitle.trim() && addSubtaskMutation.mutate(subtaskTitle.trim())}
                disabled={!subtaskTitle.trim() || addSubtaskMutation.isPending}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Delete button */}
          <div className="pt-2 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-start"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? "Deleting..." : "Delete Task"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete task?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &ldquo;{task.title}&rdquo;. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(task.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
