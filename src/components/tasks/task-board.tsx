"use client";

import { TaskCard } from "./task-card";
import { TASK_STATUS_LABELS } from "@/lib/utils/constants";
import type { Task } from "@/types";

const BOARD_COLUMNS = ["todo", "in_progress", "in_review", "done"] as const;

interface TaskBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function TaskBoard({ tasks, onTaskClick }: TaskBoardProps) {
  const columns = BOARD_COLUMNS.map((status) => ({
    status,
    label: TASK_STATUS_LABELS[status],
    tasks: tasks.filter((t) => t.status === status),
  }));

  return (
    <div className="grid grid-cols-4 gap-4">
      {columns.map((col) => (
        <div key={col.status} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{col.label}</h3>
            <span className="text-muted-foreground text-xs">
              {col.tasks.length}
            </span>
          </div>
          <div className="bg-muted/50 min-h-[200px] space-y-2 rounded-lg p-2">
            {col.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick?.(task)}
              />
            ))}
            {col.tasks.length === 0 && (
              <p className="text-muted-foreground py-8 text-center text-xs">
                No tasks
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
