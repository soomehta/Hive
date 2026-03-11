"use client";

import { create } from "zustand";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";

interface ChatOverlayStore {
  overlayOpen: boolean;
  activeSessionId: string | null;
  pendingMessage: string | null;
  pendingVoiceBlob: Blob | null;
  streamingText: string | null;
  isStreaming: boolean;
  openOverlay: () => void;
  openOverlayWithMessage: (message: string) => void;
  openOverlayWithVoice: (blob: Blob) => void;
  closeOverlay: () => void;
  setActiveSessionId: (id: string | null) => void;
  consumePendingMessage: () => string | null;
  consumePendingVoiceBlob: () => Blob | null;
  setStreamingText: (text: string | null) => void;
  setIsStreaming: (streaming: boolean) => void;
}

export const useChatOverlayStore = create<ChatOverlayStore>((set, get) => ({
  overlayOpen: false,
  activeSessionId: null,
  pendingMessage: null,
  pendingVoiceBlob: null,
  streamingText: null,
  isStreaming: false,
  openOverlay: () => set({ overlayOpen: true }),
  openOverlayWithMessage: (message) => set({ overlayOpen: true, pendingMessage: message }),
  openOverlayWithVoice: (blob) => set({ overlayOpen: true, pendingVoiceBlob: blob }),
  closeOverlay: () => set({ overlayOpen: false, pendingMessage: null, pendingVoiceBlob: null }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  consumePendingMessage: () => {
    const msg = get().pendingMessage;
    if (msg) set({ pendingMessage: null });
    return msg;
  },
  consumePendingVoiceBlob: () => {
    const blob = get().pendingVoiceBlob;
    if (blob) set({ pendingVoiceBlob: null });
    return blob;
  },
  setStreamingText: (text) => set({ streamingText: text }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
}));


export function usePAChat() {
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async ({ message, sessionId }: { message: string; sessionId?: string }) => {
      const { setStreamingText, setIsStreaming } = useChatOverlayStore.getState();

      try {
        setIsStreaming(true);
        setStreamingText("");

        const res = await apiClient("/api/pa/chat", {
          method: "POST",
          body: JSON.stringify({ message, sessionId }),
          headers: {
            Accept: "text/event-stream",
          },
        });

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error || "Failed to send message");
        }

        const contentType = res.headers.get("content-type") ?? "";

        if (contentType.includes("text/event-stream")) {
          // Streaming response
          const reader = res.body?.getReader();
          if (!reader) throw new Error("No stream reader");

          const decoder = new TextDecoder();
          let result: any = {};
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "text") {
                  setStreamingText(data.content);
                } else if (data.type === "action") {
                  result.action = data.action;
                } else if (data.type === "done") {
                  result = { ...result, ...data };
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }

          return {
            message: useChatOverlayStore.getState().streamingText,
            ...result,
          };
        } else {
          // Fallback: non-streaming JSON response
          return res.json();
        }
      } finally {
        setIsStreaming(false);
        setStreamingText(null);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-actions"] });
      queryClient.invalidateQueries({ queryKey: ["pa-sessions"] });
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

export function usePAConversationHistory(limit: number = 20) {
  return useQuery({
    queryKey: ["pa-conversations", limit],
    queryFn: async () => {
      const res = await apiClient(`/api/pa/chat?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch conversations");
      const json = await res.json();
      return json.data as Array<{
        id: string;
        role: string;
        content: string;
        metadata: Record<string, any> | null;
        createdAt: string;
      }>;
    },
    staleTime: 30_000,
  });
}

// ─── Chat Sessions ──────────────────────────────────────

export interface ChatSession {
  id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
  createdAt: string;
}

export function useChatSessions() {
  return useQuery({
    queryKey: ["pa-sessions"],
    queryFn: async () => {
      const res = await apiClient("/api/pa/conversations?limit=30");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const json = await res.json();
      return json.data as ChatSession[];
    },
    staleTime: 30_000,
  });
}

export function useChatSessionMessages(sessionId: string | null) {
  return useQuery({
    queryKey: ["pa-session-messages", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const res = await apiClient(`/api/pa/conversations/${sessionId}`);
      if (!res.ok) throw new Error("Failed to fetch session messages");
      const json = await res.json();
      return json.data as {
        session: ChatSession;
        messages: Array<{
          id: string;
          role: string;
          content: string;
          metadata: Record<string, any> | null;
          createdAt: string;
        }>;
      };
    },
    enabled: !!sessionId,
    staleTime: 10_000,
  });
}

export function useDeleteChatSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiClient(`/api/pa/conversations/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete session");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-sessions"] });
    },
  });
}

export function useRenameChatSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, title }: { sessionId: string; title: string }) => {
      const res = await apiClient(`/api/pa/conversations/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to rename session");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-sessions"] });
    },
  });
}
