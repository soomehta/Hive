import { getTaskTimeGroup } from "@/lib/utils/dates";

export function getDueDateClassName(dueDate: Date | string | null): string {
  if (!dueDate) return "text-muted-foreground";

  const group = getTaskTimeGroup(dueDate);
  switch (group) {
    case "overdue":
      return "text-destructive font-medium";
    case "today":
      return "text-orange-500 font-medium";
    case "tomorrow":
      return "text-yellow-600 dark:text-yellow-500";
    default:
      return "text-muted-foreground";
  }
}

export function isOverdue(dueDate: Date | string | null): boolean {
  if (!dueDate) return false;
  return getTaskTimeGroup(dueDate) === "overdue";
}
