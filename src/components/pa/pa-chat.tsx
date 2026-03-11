"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePAChat, useChatSessionMessages, useChatOverlayStore } from "@/hooks/use-pa";
import { useQueryClient } from "@tanstack/react-query";
import { PAMessage } from "./pa-message";
import { PAInput } from "./pa-input";
import { PAActionCard } from "./pa-action-card";
import { RotateCcw } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: any;
  isTranscribing?: boolean;
  failedText?: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hey — what can I help you with?",
};

const SUGGESTIONS = [
  "Create a task",
  "What's blocking the project?",
  "How's the team doing?",
  "Schedule deep work",
];

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
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

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

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
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

      if (result.sessionId) {
        queryClient.invalidateQueries({ queryKey: ["pa-session-messages", result.sessionId] });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: "assistant", content: `Sorry, ${errorMsg}. Please try again.`, failedText: text },
      ]);
    }
  }, [sendMessage, sessionId, onSessionCreated, queryClient]);

  const consumePendingMessage = useChatOverlayStore((s) => s.consumePendingMessage);
  const consumePendingVoiceBlob = useChatOverlayStore((s) => s.consumePendingVoiceBlob);
  const pendingConsumedRef = useRef(false);

  const handleVoice = useCallback(async (blob: Blob) => {
    const userMsg: ChatMessage = {
      id: `voice-${Date.now()}`,
      role: "user",
      content: "Transcribing your voice message...",
      isTranscribing: true,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const result = await sendVoice.mutateAsync(blob);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMsg.id ? { ...m, content: result.transcription.transcript, isTranscribing: false } : m
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

  // Auto-send pending message or voice blob from home input bar
  useEffect(() => {
    if (pendingConsumedRef.current) return;
    const pending = consumePendingMessage();
    if (pending) {
      pendingConsumedRef.current = true;
      handleSend(pending);
      return;
    }
    const voiceBlob = consumePendingVoiceBlob();
    if (voiceBlob) {
      pendingConsumedRef.current = true;
      handleVoice(voiceBlob);
    }
  }, [consumePendingMessage, consumePendingVoiceBlob, handleSend, handleVoice]);

  const isWelcomeOnly = messages.length === 1 && messages[0].id === "welcome";
  const isPending = sendMessage.isPending || sendVoice.isPending;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4" aria-label="PA conversation" role="log" aria-live="polite">
        {messages.map((msg) => (
          <div key={msg.id}>
            <PAMessage role={msg.role} content={msg.content} isTranscribing={msg.isTranscribing} />
            {msg.action && msg.action.status === "pending" && (
              <PAActionCard action={msg.action} />
            )}
            {msg.failedText && (
              <button
                onClick={() => handleSend(msg.failedText!)}
                className="mt-1.5 ml-11 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="size-3" />
                Retry
              </button>
            )}
          </div>
        ))}

        {/* Suggestion chips on welcome screen */}
        {isWelcomeOnly && !isPending && (
          <div className="flex flex-wrap gap-2 pl-11">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="neu-subtle rounded-xl bg-background px-3 py-1.5 text-xs text-muted-foreground transition-all hover:text-foreground hover:scale-[1.02] active:neu-pressed"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {isPending && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
            <div className="flex gap-1 ml-11">
              <div className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
              <div className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
              <div className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={scrollAnchorRef} />
      </div>
      <PAInput
        onSend={handleSend}
        onVoice={handleVoice}
        isLoading={isPending}
        autoFocus
      />
    </div>
  );
}
