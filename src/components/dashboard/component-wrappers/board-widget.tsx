"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from "@/lib/utils/constants";
import { getUserInitials, getUserDisplayName } from "@/lib/utils/user-display";
import type { WidgetProps } from "@/types/bees";
import type { Task } from "@/types";
import { LayoutGrid } from "lucide-react";

const STATUS_COLUMNS = ["todo", "in_progress", "in_review", "done"] as const;
type KanbanStatus = (typeof STATUS_COLUMNS)[number];

const COLUMN_ACCENT: Record<KanbanStatus, string> = {
  todo: "border-t-gray-400",
  in_progress: "border-t-blue-500",
  in_review: "border-t-purple-500",
  done: "border-t-green-500",
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

export function BoardWidget({ orgId, projectId, isEditing }: WidgetProps) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["widget-tasks-board", orgId, projectId],
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
          <LayoutGrid className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Select a project to view the board</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid h-full grid-cols-4 gap-2 p-3">
        {STATUS_COLUMNS.map((col) => (
          <div key={col} className="space-y-2">
            <Skeleton className="h-5 w-20" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const columns: Record<KanbanStatus, Task[]> = {
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
  };

  tasks?.forEach((task) => {
    if (task.status in columns) {
      columns[task.status as KanbanStatus].push(task);
    }
  });

  return (
    <div className={`grid h-full gap-2 p-3 ${isEditing ? "pointer-events-none select-none" : ""}`}
      style={{ gridTemplateColumns: `repeat(${STATUS_COLUMNS.length}, minmax(0, 1fr))` }}
    >
      {STATUS_COLUMNS.map((status) => (
        <div
          key={status}
          className={`flex flex-col rounded-lg border border-t-4 bg-muted/30 ${COLUMN_ACCENT[status]}`}
        >
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-semibold">{TASK_STATUS_LABELS[status]}</span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {columns[status].length}
            </span>
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto px-2 pb-2">
            {columns[status].length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No tasks</p>
            ) : (
              columns[status].map((task) => (
                <Card key={task.id} className="py-0 shadow-none">
                  <CardContent className="space-y-1.5 p-2.5">
                    <div className="flex items-start gap-1.5">
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[task.priority] ?? "bg-gray-400"}`}
                        title={TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
                      />
                      <p className="text-xs font-medium leading-snug">{task.title}</p>
                    </div>
                    {task.assigneeId && (
                      <div className="flex items-center gap-1">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-semibold text-violet-700">
                          {getUserInitials(getUserDisplayName({ userId: task.assigneeId }))}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
