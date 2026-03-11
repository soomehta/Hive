"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ListTodo } from "lucide-react";
import type { Project } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
  archived: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  in_progress: "In Progress",
  completed: "Completed",
  paused: "Paused",
  archived: "Archived",
};

interface ProjectCardProps {
  project: Project & { taskCount?: number; tasksDone?: number };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const createdDate = new Date(project.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const taskCount = project.taskCount ?? 0;
  const tasksDone = project.tasksDone ?? 0;
  const progressPct = taskCount > 0 ? Math.round((tasksDone / taskCount) * 100) : 0;

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {project.color && (
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: project.color }}
                />
              )}
              <CardTitle className="text-base">{project.name}</CardTitle>
            </div>
            <Badge variant="secondary" className={STATUS_COLORS[project.status] ?? ""}>
              {STATUS_LABELS[project.status] ?? project.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {project.description ? (
            <p className="text-muted-foreground text-sm line-clamp-2">
              {project.description}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm italic">No description</p>
          )}

          {taskCount > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ListTodo className="size-3" />
                  {taskCount} tasks
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  {tasksDone} done ({progressPct}%)
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No tasks yet</p>
          )}

          <p className="text-muted-foreground text-xs">Created {createdDate}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
