"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from "@/lib/utils/constants";
import { getUserInitials, getUserDisplayName } from "@/lib/utils/user-display";
import { formatDate } from "@/lib/utils/dates";
import type { WidgetProps } from "@/types/bees";
import type { Task } from "@/types";
import { List, CalendarDays } from "lucide-react";

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  todo: "outline",
  in_progress: "secondary",
  in_review: "secondary",
  done: "default",
  cancelled: "destructive",
};

export function ListWidget({ orgId, projectId, isEditing }: WidgetProps) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["widget-tasks-list", orgId, projectId],
    queryFn: async () => {
      const res = await apiClient(`/api/tasks?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return json.data as Task[];
    },
    enabled: !!orgId && !!projectId,
  });

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <List className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Select a project to view tasks</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-0 divide-y p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-5 w-14 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <List className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tasks found for this project</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-auto ${isEditing ? "pointer-events-none select-none" : ""}`}>
      {/* Table header */}
      <div className="sticky top-0 z-10 grid grid-cols-[1rem_1fr_5rem_5rem_5.5rem_2rem] items-center gap-2 border-b bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
        <span />
        <span>Title</span>
        <span>Status</span>
        <span>Priority</span>
        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />Due</span>
        <span>Who</span>
      </div>
      <div className="divide-y">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="grid grid-cols-[1rem_1fr_5rem_5rem_5.5rem_2rem] items-center gap-2 px-3 py-2 hover:bg-accent/40 transition-colors"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${PRIORITY_DOT[task.priority] ?? "bg-gray-400"}`}
            />
            <p className="truncate text-xs font-medium">{task.title}</p>
            <Badge variant={STATUS_VARIANT[task.status] ?? "outline"} className="truncate text-[10px]">
              {TASK_STATUS_LABELS[task.status] ?? task.status}
            </Badge>
            <Badge variant="secondary" className="truncate text-[10px]">
              {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {task.dueDate ? formatDate(task.dueDate, "MMM d") : "--"}
            </span>
            {task.assigneeId ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[10px] font-semibold text-violet-700">
                {getUserInitials(getUserDisplayName({ userId: task.assigneeId }))}
              </span>
            ) : (
              <span className="h-6 w-6" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
