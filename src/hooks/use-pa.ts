"use client";

import { create } from "zustand";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";

interface PAStore {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

export const usePAStore = create<PAStore>((set) => ({
  isOpen: false,
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

export function usePAChat() {
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiClient("/api/pa/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-actions"] });
    },
  });

  const sendVoice = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append("audio", audioBlob);

      // For FormData, don't set Content-Type — the browser will set it with the boundary
      const transcribeRes = await apiClient("/api/voice/transcribe", {
        method: "POST",
        body: formData,
      });
      if (!transcribeRes.ok) throw new Error("Failed to transcribe");
      const transcription = await transcribeRes.json();

      const chatRes = await apiClient("/api/pa/chat", {
        method: "POST",
        body: JSON.stringify({
          message: transcription.transcript,
          voiceTranscriptId: transcription.id,
        }),
      });
      if (!chatRes.ok) throw new Error("Failed to process");
      const chat = await chatRes.json();

      return { transcription, chat };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-actions"] });
    },
  });

  return { sendMessage, sendVoice };
}

export function usePAActions() {
  return useQuery({
    queryKey: ["pa-actions"],
    queryFn: async () => {
      const res = await apiClient("/api/pa/actions");
      if (!res.ok) throw new Error("Failed to fetch actions");
      const json = await res.json();
      return json.data;
    },
  });
}

export function useActionDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      actionId,
      decision,
      editedPayload,
      rejectionReason,
    }: {
      actionId: string;
      decision: "approve" | "reject" | "edit";
      editedPayload?: Record<string, any>;
      rejectionReason?: string;
    }) => {
      const res = await apiClient(`/api/pa/actions/${actionId}`, {
        method: "PATCH",
        body: JSON.stringify({ decision, editedPayload, rejectionReason }),
      });
      if (!res.ok) throw new Error("Failed to update action");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-actions"] });
    },
  });
}

export function usePABriefing() {
  return useQuery({
    queryKey: ["pa-briefing"],
    queryFn: async () => {
      const res = await apiClient("/api/pa/briefing");
      if (!res.ok) throw new Error("Failed to fetch briefing");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
