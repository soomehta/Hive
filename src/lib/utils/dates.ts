import {
  formatDistanceToNow,
  format,
  isToday,
  isTomorrow,
  isYesterday,
  isThisWeek,
  isPast,
  addDays,
} from "date-fns";

export function relativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDate(date: Date | string, fmt: string = "MMM d, yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, fmt);
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, "MMM d, yyyy 'at' h:mm a");
}

export type TaskTimeGroup = "overdue" | "today" | "tomorrow" | "this_week" | "later" | "no_date";

export function getTaskTimeGroup(dueDate: Date | string | null): TaskTimeGroup {
  if (!dueDate) return "no_date";
  const d = typeof dueDate === "string" ? new Date(dueDate) : dueDate;

  if (isPast(d) && !isToday(d)) return "overdue";
  if (isToday(d)) return "today";
  if (isTomorrow(d)) return "tomorrow";
  if (isThisWeek(d)) return "this_week";
  return "later";
}

export const TIME_GROUP_LABELS: Record<TaskTimeGroup, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  this_week: "This Week",
  later: "Later",
  no_date: "No Due Date",
};

export function groupTasksByTimeframe<T extends { dueDate: Date | string | null }>(
  tasks: T[]
): Record<TaskTimeGroup, T[]> {
  const groups: Record<TaskTimeGroup, T[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    this_week: [],
    later: [],
    no_date: [],
  };

  for (const task of tasks) {
    const group = getTaskTimeGroup(task.dueDate);
    groups[group].push(task);
  }

  return groups;
}
