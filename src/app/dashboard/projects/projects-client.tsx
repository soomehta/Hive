"use client";

import { useState } from "react";
import Link from "next/link";
import { useOrg } from "@/hooks/use-org";
import { useProjectsQuery } from "@/hooks/queries/use-projects";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, FolderKanban } from "lucide-react";
import { PROJECT_STATUS_LABELS } from "@/lib/utils/constants";
import { EmptyState } from "@/components/shared/empty-state";

const STATUS_TABS = ["all", "active", "paused", "completed", "archived"] as const;

export function PageClient() {
  const { orgId } = useOrg();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: projects, isLoading } = useProjectsQuery();

  const filteredProjects =
    statusFilter === "all"
      ? projects
      : projects?.filter((p) => p.status === statusFilter);

  if (!orgId) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-lg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">
            Manage and organize your team projects
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/projects/new">
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      <Tabs
        value={statusFilter}
        onValueChange={setStatusFilter}
      >
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab === "all" ? "All" : PROJECT_STATUS_LABELS[tab] ?? tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab} value={tab}>
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
              </div>
            ) : !filteredProjects || filteredProjects.length === 0 ? (
              <div className="rounded-lg border border-dashed">
                <EmptyState
                  icon={<FolderKanban />}
                  title="No projects found"
                  description={
                    statusFilter === "all"
                      ? "Get started by creating your first project."
                      : `No ${PROJECT_STATUS_LABELS[statusFilter]?.toLowerCase() ?? statusFilter} projects.`
                  }
                  action={
                    statusFilter === "all" ? (
                      <Button asChild>
                        <Link href="/dashboard/projects/new">
                          <Plus className="h-4 w-4" />
                          Create Project
                        </Link>
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
