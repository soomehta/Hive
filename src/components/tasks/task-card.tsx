"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, User } from "lucide-react";
import { formatDate } from "@/lib/utils/dates";
import type { Task } from "@/types";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  in_review: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <Card
      className="hover:border-primary/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium leading-tight">{task.title}</h4>
          <Badge
            variant="secondary"
            className={`shrink-0 text-xs ${PRIORITY_COLORS[task.priority] ?? ""}`}
          >
            {task.priority}
          </Badge>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className={`text-xs ${STATUS_COLORS[task.status] ?? ""}`}
          >
            {task.status.replace("_", " ")}
          </Badge>
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(task.dueDate, "MMM d")}
            </span>
          )}
          {task.assigneeId && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Assigned
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
