"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
import type { SlotConfig, Pathway } from "@/types/bees";

export function useDashboardLayout(projectId?: string) {
  const { orgId } = useOrg();

  const query = useQuery({
    queryKey: ["dashboard-layout", orgId, projectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      const res = await apiClient(`/api/dashboard/layouts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch layout");
      const json = await res.json();
      return json.data as {
        id: string;
        pathway: Pathway;
        layoutPresetIndex: number;
        slots: SlotConfig[];
      } | null;
    },
    enabled: !!orgId,
  });

  const queryClient = useQueryClient();

  const saveLayout = useMutation({
    mutationFn: async (data: {
      pathway: Pathway;
      layoutPresetIndex: number;
      slots: SlotConfig[];
      projectId?: string;
    }) => {
      const res = await apiClient("/api/dashboard/layouts", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save layout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dashboard-layout", orgId, projectId],
      });
    },
  });

  return {
    layout: query.data,
    isLoading: query.isLoading,
    saveLayout: saveLayout.mutate,
    isSaving: saveLayout.isPending,
  };
}
