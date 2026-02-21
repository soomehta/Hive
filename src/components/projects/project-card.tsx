"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const createdDate = new Date(project.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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
          <p className="text-muted-foreground text-xs">Created {createdDate}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
