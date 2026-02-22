"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
import type { BeeTemplate, BeeInstance } from "@/types/bees";

export function useBeeTemplates() {
  const { orgId } = useOrg();

  return useQuery({
    queryKey: ["bee-templates", orgId],
    queryFn: async () => {
      const res = await apiClient("/api/bees/templates");
      if (!res.ok) throw new Error("Failed to fetch bee templates");
      const json = await res.json();
      return json.data as BeeTemplate[];
    },
    enabled: !!orgId,
  });
}

export function useBeeInstances(projectId?: string) {
  const { orgId } = useOrg();

  return useQuery({
    queryKey: ["bee-instances", orgId, projectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      const res = await apiClient(`/api/bees/instances?${params}`);
      if (!res.ok) throw new Error("Failed to fetch bee instances");
      const json = await res.json();
      return json.data as Array<{ instance: BeeInstance; template: BeeTemplate }>;
    },
    enabled: !!orgId,
  });
}

export function useCreateBeeTemplate() {
  const queryClient = useQueryClient();
  const { orgId } = useOrg();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      type: string;
      subtype?: string;
      systemPrompt: string;
      toolAccess?: string[];
      defaultAutonomyTier?: string;
      triggerConditions?: { intents?: string[]; keywords?: string[] };
    }) => {
      const res = await apiClient("/api/bees/templates", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create bee template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bee-templates", orgId] });
    },
  });
}

export function useUpdateBeeTemplate() {
  const queryClient = useQueryClient();
  const { orgId } = useOrg();

  return useMutation({
    mutationFn: async ({
      templateId,
      ...data
    }: {
      templateId: string;
      name?: string;
      systemPrompt?: string;
      toolAccess?: string[];
      isActive?: boolean;
    }) => {
      const res = await apiClient(`/api/bees/templates/${templateId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update bee template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bee-templates", orgId] });
    },
  });
}

export function useDeleteBeeTemplate() {
  const queryClient = useQueryClient();
  const { orgId } = useOrg();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const res = await apiClient(`/api/bees/templates/${templateId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete bee template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bee-templates", orgId] });
    },
  });
}
