"use client";

import { AlertCircle, CheckSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils/dates";
import { getDueDateClassName, isOverdue } from "@/components/shared/due-date-styles";
import { getUserDisplayName, getUserInitials } from "@/lib/utils/user-display";
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/lib/utils/constants";
import type { Task } from "@/types";

interface TaskListViewProps {
  tasks: Task[];
  selectedTasks: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenDetail: (task: Task) => void;
}

export function TaskListView({
  tasks,
  selectedTasks,
  onToggleSelect,
  onToggleSelectAll,
  onOpenDetail,
}: TaskListViewProps) {
  const allSelected = selectedTasks.size > 0 && selectedTasks.size === tasks.length;
  const someSelected = selectedTasks.size > 0 && selectedTasks.size < tasks.length;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {/* Select All Header */}
          <div className="flex items-center gap-4 px-4 py-2 bg-muted/30">
            <button
              type="button"
              onClick={onToggleSelectAll}
              className="shrink-0"
              aria-label={allSelected ? "Deselect all" : "Select all"}
            >
              <div
                className={`h-4 w-4 rounded border ${
                  allSelected
                    ? "bg-primary border-primary"
                    : someSelected
                      ? "bg-primary/50 border-primary"
                      : "border-muted-foreground/40"
                } flex items-center justify-center`}
              >
                {selectedTasks.size > 0 && (
                  <CheckSquare className="h-3 w-3 text-primary-foreground" />
                )}
              </div>
            </button>
            <span className="text-xs text-muted-foreground">
              {selectedTasks.size > 0
                ? `${selectedTasks.size} selected`
                : "Select all"}
            </span>
          </div>

          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex w-full items-center gap-4 px-4 py-3 hover:bg-accent/50 transition-colors"
            >
              <button
                type="button"
                onClick={() => onToggleSelect(task.id)}
                className="shrink-0"
                aria-label={selectedTasks.has(task.id) ? "Deselect task" : "Select task"}
              >
                <div
                  className={`h-4 w-4 rounded border ${selectedTasks.has(task.id) ? "bg-primary border-primary" : "border-muted-foreground/40"} flex items-center justify-center`}
                >
                  {selectedTasks.has(task.id) && (
                    <CheckSquare className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
              </button>
              <button
                type="button"
                className="flex flex-1 items-center gap-4 cursor-pointer text-left min-w-0"
                onClick={() => onOpenDetail(task)}
                aria-label={`View task: ${task.title}`}
              >
                <div
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    PRIORITY_DOT_COLORS[task.priority] ?? "bg-gray-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  {task.description && (
                    <p className="text-muted-foreground text-xs truncate">
                      {task.description}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs shrink-0 hidden sm:inline-flex">
                  {TASK_STATUS_LABELS[task.status] ?? task.status}
                </Badge>
                <Badge variant="secondary" className="text-xs shrink-0 hidden sm:inline-flex">
                  {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
                </Badge>
                {task.assigneeId && (
                  <Avatar size="sm" className="hidden sm:flex">
                    <AvatarFallback>
                      {getUserInitials(getUserDisplayName({ userId: task.assigneeId }))}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span
                  className={`text-xs shrink-0 w-24 text-right items-center justify-end gap-1 hidden sm:flex ${getDueDateClassName(task.dueDate)}`}
                >
                  {task.dueDate && isOverdue(task.dueDate) && <AlertCircle className="h-3 w-3" />}
                  {task.dueDate ? formatDate(task.dueDate) : "No date"}
                </span>
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const PRIORITY_DOT_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};
