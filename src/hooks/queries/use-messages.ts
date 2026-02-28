"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
import type { Message } from "@/types";

export function useMessagesQuery(projectId: string) {
  const { orgId } = useOrg();

  return useQuery({
    queryKey: ["messages", projectId, orgId],
    queryFn: async () => {
      const res = await apiClient(`/api/messages?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const json = await res.json();
      return json.data as Message[];
    },
    enabled: !!orgId && !!projectId,
  });
}

export interface CreateMessageInput {
  projectId: string;
  title: string;
  content: string;
  isPinned?: boolean;
}

export function useCreateMessageMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMessageInput) => {
      const res = await apiClient("/api/messages", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to create message");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", projectId] });
    },
  });
}
