"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, FolderKanban } from "lucide-react";
import type { Project } from "@/types";
import { PROJECT_STATUS_LABELS } from "@/lib/utils/constants";

const STATUS_TABS = ["all", "active", "paused", "completed", "archived"] as const;

export default function ProjectsPage() {
  const { orgId } = useOrg();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const {
    data: projects,
    isLoading,
  } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const res = await apiClient("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const json = await res.json();
      return json.data as Project[];
    },
    enabled: !!orgId,
  });

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
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
                <FolderKanban className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="text-lg font-medium">No projects found</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {statusFilter === "all"
                    ? "Get started by creating your first project."
                    : `No ${PROJECT_STATUS_LABELS[statusFilter]?.toLowerCase() ?? statusFilter} projects.`}
                </p>
                {statusFilter === "all" && (
                  <Button asChild className="mt-4">
                    <Link href="/dashboard/projects/new">
                      <Plus className="h-4 w-4" />
                      Create Project
                    </Link>
                  </Button>
                )}
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
