"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Brain, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/utils/api-client";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Welcome to the Hive. I'm your workspace assistant — I'll help you get set up in just a moment.\n\nWhat's your team or company called?",
};

export function OnboardingChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [setupDone, setSetupDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (setupDone && orgId) {
      sessionStorage.setItem("hive-org-id", orgId);
      const timer = setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [setupDone, orgId, router]);

  // Use refs to avoid stale closures in handleSend
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const orgIdRef = useRef(orgId);
  orgIdRef.current = orgId;

  const handleSend = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: messageText.trim(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setText("");
      setIsLoading(true);

      try {
        // Build from ref to get latest messages including concurrent additions
        const currentMessages = [...messagesRef.current, userMsg];
        const apiMessages = currentMessages
          .filter((m) => m.id !== "welcome")
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await apiClient("/api/pa/onboard", {
          method: "POST",
          body: JSON.stringify({
            messages: apiMessages,
            orgId: orgIdRef.current ?? undefined,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to process");
        }

        const data = await res.json();

        if (data.orgId) setOrgId(data.orgId);
        if (data.setupComplete) setSetupDone(true);

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.message,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "I ran into a hiccup. Could you try that again?",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(text);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-8 space-y-5"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="neu-subtle flex size-9 shrink-0 items-center justify-center rounded-xl bg-background">
                <Brain className="size-4 text-muted-foreground" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "neu-pressed bg-background text-foreground"
                  : "neu-subtle bg-background text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="neu-subtle flex size-9 shrink-0 items-center justify-center rounded-xl bg-background">
              <Brain className="size-4 text-muted-foreground" />
            </div>
            <div className="neu-subtle flex items-center gap-2 rounded-2xl bg-background px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Setting things up...
            </div>
          </div>
        )}

        {setupDone && (
          <div className="flex items-center justify-center py-4">
            <div className="neu-flat flex items-center gap-2 rounded-2xl bg-background px-5 py-3 text-sm font-medium text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Taking you to your workspace...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      {!setupDone && (
        <div className="px-4 py-5">
          <form
            onSubmit={handleSubmit}
            className="neu-flat mx-auto flex max-w-lg items-center gap-2 rounded-2xl bg-background px-4 py-3 transition-all duration-200 focus-within:neu-pressed"
          >
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!text.trim() || isLoading}
              className="neu-btn flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
