"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
import type { Project } from "@/types";

export function useProjectsQuery() {
  const { orgId } = useOrg();

  return useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const res = await apiClient("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const json = await res.json();
      return json.data as Project[];
    },
    enabled: !!orgId,
  });
}

export function useProjectQuery(projectId: string) {
  const { orgId } = useOrg();

  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await apiClient(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      const json = await res.json();
      return json.data as Project;
    },
    enabled: !!orgId && !!projectId,
  });
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  status?: string;
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      const res = await apiClient("/api/projects", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to create project");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
