"use client";

import { useState, useRef, useEffect } from "react";
import { usePAChat } from "@/hooks/use-pa";
import { PAMessage } from "./pa-message";
import { PAInput } from "./pa-input";
import { PAActionCard } from "./pa-action-card";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: any;
}

export function PAChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your Hive PA. Try asking me:\n\n• \"Create a task for design review by Friday\"\n• \"What's blocking the project?\"\n• \"Block my calendar for deep work tomorrow\"\n• \"How's the team doing this week?\"",
    },
  ]);
  const { sendMessage, sendVoice } = usePAChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(text: string) {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const result = await sendMessage.mutateAsync(text);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.message,
        action: result.action,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    }
  }

  async function handleVoice(blob: Blob) {
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
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id}>
            <PAMessage role={msg.role} content={msg.content} />
            {msg.action && msg.action.status === "pending" && (
              <PAActionCard action={msg.action} />
            )}
          </div>
        ))}
        {(sendMessage.isPending || sendVoice.isPending) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="size-2 animate-pulse rounded-full bg-violet-400" />
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
