"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { WidgetProps } from "@/types/bees";
import type { Task } from "@/types";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
} from "date-fns";

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-400",
  low: "bg-green-500",
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CalendarWidget({ orgId, projectId, isEditing }: WidgetProps) {
  const [viewDate, setViewDate] = useState(new Date());

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["widget-tasks-calendar", orgId, projectId],
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
          <CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Select a project to view the calendar</p>
        </div>
      </div>
    );
  }

  const tasksWithDates = tasks?.filter((t) => t.dueDate) ?? [];

  // Build a map: "yyyy-MM-dd" -> Task[]
  const tasksByDay = new Map<string, Task[]>();
  tasksWithDates.forEach((task) => {
    const key = format(new Date(task.dueDate!), "yyyy-MM-dd");
    const existing = tasksByDay.get(key) ?? [];
    tasksByDay.set(key, [...existing, task]);
  });

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad leading empty cells for first week
  const leadingBlanks = getDay(monthStart);

  return (
    <div className={`flex h-full flex-col p-3 ${isEditing ? "pointer-events-none select-none" : ""}`}>
      {/* Navigation header */}
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setViewDate((d) => subMonths(d, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">{format(viewDate, "MMMM yyyy")}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setViewDate((d) => addMonths(d, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday labels */}
      <div className="mb-1 grid grid-cols-7 shrink-0">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-center text-[10px] font-medium text-muted-foreground">
            {d}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="grid flex-1 grid-cols-7 gap-0.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="rounded" />
          ))}
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-7 gap-px">
          {/* Leading blanks */}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDay.get(key) ?? [];
            const isCurrentMonth = isSameMonth(day, viewDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={key}
                className={`flex flex-col items-center rounded p-0.5 ${
                  isToday ? "bg-violet-100 dark:bg-violet-900/30" : "hover:bg-muted/50"
                } ${!isCurrentMonth ? "opacity-30" : ""}`}
              >
                <span
                  className={`text-[11px] font-medium leading-tight ${
                    isToday ? "text-violet-700 dark:text-violet-300" : "text-foreground/80"
                  }`}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                  {dayTasks.slice(0, 3).map((task) => (
                    <span
                      key={task.id}
                      className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority] ?? "bg-gray-400"}`}
                      title={task.title}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[9px] text-muted-foreground">+{dayTasks.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
