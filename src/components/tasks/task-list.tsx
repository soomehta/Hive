"use client";

import { TaskCard } from "./task-card";
import type { Task } from "@/types";

interface TaskListProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function TaskList({ tasks, onTaskClick }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No tasks found.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
      ))}
    </div>
  );
}
