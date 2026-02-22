"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserInitials, getUserDisplayName } from "@/lib/utils/user-display";
import type { WidgetProps } from "@/types/bees";
import type { Task } from "@/types";
import { Users } from "lucide-react";

const AVATAR_PALETTE = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

const STATUS_BAR_COLOR: Record<string, string> = {
  todo: "bg-gray-400",
  in_progress: "bg-blue-500",
  in_review: "bg-violet-500",
  done: "bg-green-500",
  cancelled: "bg-red-400",
};

export function TeamWidget({ orgId, projectId, isEditing }: WidgetProps) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["widget-tasks-team", orgId, projectId],
    queryFn: async () => {
      const url = projectId
        ? `/api/tasks?projectId=${projectId}`
        : `/api/tasks`;
      const res = await apiClient(url);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return json.data as Task[];
    },
    enabled: !!orgId,
  });

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Select a project to view team workload</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <Skeleton className="h-5 w-8 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Group assigned tasks by assigneeId
  const assigneeMap = new Map<string, Task[]>();
  tasks?.forEach((task) => {
    if (!task.assigneeId) return;
    const existing = assigneeMap.get(task.assigneeId) ?? [];
    assigneeMap.set(task.assigneeId, [...existing, task]);
  });

  const unassigned = tasks?.filter((t) => !t.assigneeId).length ?? 0;

  if (assigneeMap.size === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No assigned tasks found</p>
        </div>
      </div>
    );
  }

  const maxTasks = Math.max(...Array.from(assigneeMap.values()).map((t) => t.length), 1);

  return (
    <div className={`h-full overflow-y-auto p-3 ${isEditing ? "pointer-events-none select-none" : ""}`}>
      <div className="space-y-3">
        {Array.from(assigneeMap.entries()).map(([userId, memberTasks], idx) => {
          const displayName = getUserDisplayName({ userId });
          const initials = getUserInitials(displayName);
          const done = memberTasks.filter((t) => t.status === "done").length;
          const active = memberTasks.filter(
            (t) => t.status === "in_progress" || t.status === "in_review"
          ).length;
          const avatarClass = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];

          return (
            <div key={userId} className="flex items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarClass}`}
                aria-label={displayName}
              >
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs font-medium">{displayName}</p>
                  <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">
                    {done}/{memberTasks.length} done
                  </span>
                </div>
                {/* Stacked workload bar */}
                <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  {memberTasks.map((t) => (
                    <div
                      key={t.id}
                      className={`h-full ${STATUS_BAR_COLOR[t.status] ?? "bg-gray-300"}`}
                      style={{ width: `${100 / maxTasks}%` }}
                      title={t.title}
                    />
                  ))}
                </div>
                <div className="mt-0.5 flex gap-2">
                  <span className="text-[10px] text-blue-500">{active} active</span>
                  <span className="text-[10px] text-green-600">{done} done</span>
                </div>
              </div>
            </div>
          );
        })}
        {unassigned > 0 && (
          <div className="flex items-center gap-3 border-t pt-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              --
            </span>
            <p className="text-xs text-muted-foreground">{unassigned} unassigned task{unassigned !== 1 ? "s" : ""}</p>
          </div>
        )}
      </div>
    </div>
  );
}
