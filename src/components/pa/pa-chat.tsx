"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePAChat, useChatSessionMessages } from "@/hooks/use-pa";
import { useQueryClient } from "@tanstack/react-query";
import { PAMessage } from "./pa-message";
import { PAInput } from "./pa-input";
import { PAActionCard } from "./pa-action-card";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: any;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I'm your Hive PA. Try asking me:\n\n• \"Create a task for design review by Friday\"\n• \"What's blocking the project?\"\n• \"Block my calendar for deep work tomorrow\"\n• \"How's the team doing this week?\"",
};

interface PAChatProps {
  sessionId: string | null;
  onSessionCreated?: (sessionId: string) => void;
}

export function PAChat({ sessionId, onSessionCreated }: PAChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const { sendMessage, sendVoice } = usePAChat();
  const { data: sessionData } = useChatSessionMessages(sessionId);
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load session messages when switching sessions
  useEffect(() => {
    if (sessionId && sessionData?.messages && !historyLoaded) {
      const restored: ChatMessage[] = sessionData.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));
      setMessages(restored.length > 0 ? restored : [WELCOME_MESSAGE]);
      setHistoryLoaded(true);
    }
  }, [sessionId, sessionData, historyLoaded]);

  // Reset when session changes
  useEffect(() => {
    setHistoryLoaded(false);
    if (!sessionId) {
      setMessages([WELCOME_MESSAGE]);
    }
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const result = await sendMessage.mutateAsync({ message: text, sessionId: sessionId ?? undefined });

      // If this created a new session, notify parent
      if (!sessionId && result.sessionId) {
        onSessionCreated?.(result.sessionId);
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.message,
        action: result.action,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Invalidate session messages cache
      if (result.sessionId) {
        queryClient.invalidateQueries({ queryKey: ["pa-session-messages", result.sessionId] });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: "assistant", content: `Sorry, ${errorMsg}. Please try again.` },
      ]);
    }
  }, [sendMessage, sessionId, onSessionCreated, queryClient]);

  const handleVoice = useCallback(async (blob: Blob) => {
    const userMsg: ChatMessage = {
      id: `voice-${Date.now()}`,
      role: "user",
      content: "Voice message...",
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const result = await sendVoice.mutateAsync(blob);
      // Update the voice message with transcript
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMsg.id ? { ...m, content: result.transcription.transcript } : m
        )
      );
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.chat.message,
        action: result.chat.action,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: "assistant", content: "Sorry, I couldn't process that voice message." },
      ]);
    }
  }, [sendVoice]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" aria-label="PA conversation" role="log" aria-live="polite">
        {messages.map((msg) => (
          <div key={msg.id}>
            <PAMessage role={msg.role} content={msg.content} />
            {msg.action && msg.action.status === "pending" && (
              <PAActionCard action={msg.action} />
            )}
          </div>
        ))}
        {(sendMessage.isPending || sendVoice.isPending) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <div className="size-2 animate-pulse rounded-full bg-violet-400" aria-hidden="true" />
            Thinking...
          </div>
        )}
      </div>
      <PAInput
        onSend={handleSend}
        onVoice={handleVoice}
        isLoading={sendMessage.isPending || sendVoice.isPending}
      />
    </div>
  );
}
