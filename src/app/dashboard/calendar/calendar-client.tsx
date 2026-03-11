"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/utils/api-client";
import { Button } from "@/components/ui/button";
import { PRIORITY_DOT_COLORS } from "@/lib/utils/constants";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string | null;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarPageClient() {
  const router = useRouter();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Fetch all tasks (no project filter — workspace-wide calendar view)
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["calendar-tasks"],
    queryFn: async () => {
      const res = await apiClient("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return json.data as Task[];
    },
  });

  // Keyboard navigation: left/right arrows change months
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't hijack arrow keys when the user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "ArrowLeft") setViewDate((d) => subMonths(d, 1));
      if (e.key === "ArrowRight") setViewDate((d) => addMonths(d, 1));
      if (e.key === "Escape") setSelectedDay(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter to tasks that have a due date, then build a day-keyed map
  const tasksWithDates = tasks?.filter((t) => t.dueDate) ?? [];
  const tasksByDay = new Map<string, Task[]>();
  tasksWithDates.forEach((task) => {
    const key = format(new Date(task.dueDate!), "yyyy-MM-dd");
    const existing = tasksByDay.get(key) ?? [];
    tasksByDay.set(key, [...existing, task]);
  });

  // Calendar geometry
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = getDay(monthStart);
  // Always render 6 rows (42 cells) so the grid height stays stable
  const trailingBlanks = 42 - leadingBlanks - days.length;

  const selectedDayTasks = selectedDay
    ? (tasksByDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [])
    : [];

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Main calendar column ── */}
      <div className="flex flex-1 flex-col overflow-hidden p-6">
        {/* Page header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="size-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setViewDate(new Date());
                setSelectedDay(new Date());
              }}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous month"
              onClick={() => setViewDate((d) => subMonths(d, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[160px] text-center text-lg font-semibold">
              {format(viewDate, "MMMM yyyy")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next month"
              onClick={() => setViewDate((d) => addMonths(d, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Weekday header row */}
        <div className="mb-1 grid grid-cols-7">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-sm font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid — 6 rows × 7 cols, 1 px gaps, rounded border container */}
        {isLoading ? (
          <div className="grid flex-1 animate-pulse grid-cols-7 grid-rows-[repeat(6,1fr)] gap-px rounded-xl border bg-border">
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="bg-muted/40" />
            ))}
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-7 grid-rows-[repeat(6,1fr)] gap-px overflow-hidden rounded-xl border bg-border">
            {/* Leading blank cells */}
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-start-${i}`} className="bg-background" />
            ))}

            {/* Day cells */}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayTasks = tasksByDay.get(key) ?? [];
              const today = isToday(day);
              const selected = selectedDay !== null && isSameDay(day, selectedDay);

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(selected ? null : day)}
                  aria-label={`${format(day, "MMMM d, yyyy")}${dayTasks.length > 0 ? `, ${dayTasks.length} task${dayTasks.length !== 1 ? "s" : ""}` : ""}`}
                  aria-pressed={selected}
                  className={[
                    "flex flex-col bg-background p-2 text-left transition-colors",
                    today ? "bg-violet-50 dark:bg-violet-900/20" : "",
                    selected ? "ring-2 ring-inset ring-violet-500" : "hover:bg-muted/50",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {/* Day number */}
                  <span
                    className={`text-sm font-medium ${
                      today
                        ? "text-violet-700 dark:text-violet-300"
                        : "text-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Priority dots */}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <span
                        key={task.id}
                        className={`h-2 w-2 rounded-full ${PRIORITY_DOT_COLORS[task.priority] ?? "bg-gray-400"}`}
                        title={task.title}
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] leading-none text-muted-foreground">
                        +{dayTasks.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Trailing blank cells to fill row 6 */}
            {Array.from({ length: trailingBlanks }).map((_, i) => (
              <div key={`blank-end-${i}`} className="bg-background" />
            ))}
          </div>
        )}

        {/* Keyboard hint */}
        <p className="mt-3 text-xs text-muted-foreground">
          Use arrow keys to navigate months. Click a day to see its tasks.
        </p>
      </div>

      {/* ── Side panel ── */}
      {selectedDay && (
        <aside className="flex w-80 shrink-0 flex-col border-l bg-background">
          {/* Panel header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-base font-semibold">
              {format(selectedDay, "EEEE, MMM d")}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close day panel"
              onClick={() => setSelectedDay(null)}
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedDayTasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 pt-8 text-center">
                <CalendarDays className="size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No tasks due on this day.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {selectedDayTasks.length} task
                  {selectedDayTasks.length !== 1 ? "s" : ""} due
                </p>
                {selectedDayTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      if (task.projectId) {
                        router.push(
                          `/dashboard/projects/${task.projectId}/tasks`
                        );
                      } else {
                        router.push("/dashboard/my-tasks");
                      }
                    }}
                    className="neu-subtle w-full rounded-xl bg-background p-3 text-left transition-all hover:scale-[1.02]"
                  >
                    {/* Task title row */}
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT_COLORS[task.priority] ?? "bg-gray-400"}`}
                      />
                      <span className="text-sm font-medium leading-snug">
                        {task.title}
                      </span>
                    </div>

                    {/* Status / priority meta row */}
                    <div className="mt-1.5 flex items-center gap-1.5 pl-4 text-xs text-muted-foreground">
                      <span className="capitalize">
                        {task.status.replace(/_/g, " ")}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span className="capitalize">{task.priority}</span>
                      {task.projectId && (
                        <>
                          <span aria-hidden="true">•</span>
                          <span className="text-violet-600 dark:text-violet-400">
                            View project
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
