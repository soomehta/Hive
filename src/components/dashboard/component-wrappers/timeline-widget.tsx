"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils/dates";
import type { WidgetProps } from "@/types/bees";
import type { Task } from "@/types";
import { CalendarRange } from "lucide-react";

const BAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

export function TimelineWidget({ orgId, projectId, isEditing }: WidgetProps) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["widget-tasks-timeline", orgId, projectId],
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
          <CalendarRange className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Select a project to view the timeline</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-24 shrink-0" />
            <Skeleton className="h-5 rounded" style={{ width: `${30 + i * 10}%` }} />
          </div>
        ))}
      </div>
    );
  }

  const tasksWithDates = tasks?.filter((t) => t.dueDate) ?? [];

  if (tasksWithDates.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <CalendarRange className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tasks with due dates to display</p>
        </div>
      </div>
    );
  }

  // Determine the visible date range: today to max due date (or at least 14 days)
  const now = new Date();
  const dueDates = tasksWithDates.map((t) => new Date(t.dueDate!).getTime());
  const rangeStart = now.getTime();
  const rangeEnd = Math.max(...dueDates, now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const totalMs = rangeEnd - rangeStart;

  // Generate day markers every ~7 days
  const markerCount = 4;
  const markers: Date[] = Array.from({ length: markerCount + 1 }, (_, i) =>
    new Date(rangeStart + (totalMs / markerCount) * i)
  );

  return (
    <div className={`flex h-full flex-col overflow-hidden ${isEditing ? "pointer-events-none select-none" : ""}`}>
      {/* Day axis */}
      <div className="flex shrink-0 border-b px-4 py-1.5">
        <div className="w-28 shrink-0" />
        <div className="relative flex-1">
          {markers.map((m, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 text-[10px] text-muted-foreground"
              style={{ left: `${(i / markerCount) * 100}%` }}
            >
              {formatDate(m, "MMM d")}
            </span>
          ))}
        </div>
      </div>

      {/* Task bars */}
      <div className="flex-1 space-y-1 overflow-y-auto px-4 py-2">
        {tasksWithDates.map((task, idx) => {
          const dueMs = new Date(task.dueDate!).getTime();
          // Start bar from task creation or 0 offset; end at due date
          const startMs = task.createdAt
            ? Math.max(new Date(task.createdAt).getTime(), rangeStart)
            : rangeStart;
          const leftPct = clamp(((startMs - rangeStart) / totalMs) * 100, 0, 95);
          const rightPct = clamp(((dueMs - rangeStart) / totalMs) * 100, leftPct + 2, 100);
          const widthPct = rightPct - leftPct;

          return (
            <div key={task.id} className="flex items-center gap-2">
              <p className="w-28 shrink-0 truncate text-[11px] font-medium text-foreground/80">
                {task.title}
              </p>
              <div className="relative flex-1 h-5">
                <div
                  className={`absolute top-0 h-5 rounded-sm ${BAR_COLORS[idx % BAR_COLORS.length]} opacity-80`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  title={`Due ${formatDate(task.dueDate!)}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
