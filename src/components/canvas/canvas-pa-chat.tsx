"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Brain,
  Send,
  Mic,
  Square,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { usePAChat } from "@/hooks/use-pa";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { PAActionCard } from "@/components/pa/pa-action-card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// CanvasPAChat
//
// The single, self-contained PA chat for the canvas dashboard. No overlay,
// no modal — messages float as bubbles rising from the input bar at the
// bottom-center. Older bubbles fade out via a gradient mask at the top;
// hovering over the gradient reveals hidden messages.
// ---------------------------------------------------------------------------

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

/** Height (px) of the visible bubble area before fade begins. */
const BUBBLE_AREA_HEIGHT = 420;
/** Height (px) of the fade-out gradient zone. */
const FADE_ZONE_HEIGHT = 80;

// ---------------------------------------------------------------------------
// Linkify helper (same as pa-message.tsx)
// ---------------------------------------------------------------------------

function linkifyContent(text: string): ReactNode[] {
  const pattern = /\[([^\]]+)\]\((\/dashboard\/[^\s)]+)\)|(\/dashboard\/[^\s,.)]+)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1] && match[2]) {
      parts.push(
        <Link key={match.index} href={match[2]} className="text-primary underline hover:text-primary/80">
          {match[1]}
        </Link>
      );
    } else if (match[3]) {
      parts.push(
        <Link key={match.index} href={match[3]} className="text-primary underline hover:text-primary/80">
          {match[3]}
        </Link>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : [text];
}

// ---------------------------------------------------------------------------
// Single chat bubble
// ---------------------------------------------------------------------------

function ChatBubble({
  msg,
  onRetry,
}: {
  msg: ChatMessage;
  onRetry?: (text: string) => void;
}) {
  const isUser = msg.role === "user";

  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-foreground/10 text-foreground"
            : "bg-background/80 text-foreground border border-border/50",
          msg.isTranscribing && "animate-pulse"
        )}
      >
        <p className="whitespace-pre-wrap">{linkifyContent(msg.content)}</p>
      </div>
      {msg.action && msg.action.status === "pending" && (
        <div className="w-full max-w-[85%]">
          <PAActionCard action={msg.action} />
        </div>
      )}
      {msg.failedText && onRetry && (
        <button
          onClick={() => onRetry(msg.failedText!)}
          className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="size-2.5" />
          Retry
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CanvasPAChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const { sendMessage, sendVoice } = usePAChat();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  // Fade-out hover state
  const [isHoveringFade, setIsHoveringFade] = useState(false);

  // Voice recorder
  const { state: voiceState, startRecording, stopRecording, audioBlob, duration, error: voiceError } =
    useVoiceRecorder();
  const sentBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    if (voiceError) toast.error("Microphone access failed.");
  }, [voiceError]);

  useEffect(() => {
    if (audioBlob && voiceState === "idle" && audioBlob !== sentBlobRef.current) {
      sentBlobRef.current = audioBlob;
      handleVoice(audioBlob);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob, voiceState]);

  // Suggestion chip
  const { data: suggestion } = useQuery({
    queryKey: ["pa-suggestion"],
    queryFn: async () => {
      const res = await apiClient("/api/pa/suggest");
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as { suggestion: string; taskId: string | null };
    },
    staleTime: 60_000,
    retry: false,
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- Send handlers ---------------------------------------------------- //

  const handleSend = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const result = await sendMessage.mutateAsync({ message: text });

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.message,
          action: result.action,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Something went wrong";
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: `Sorry, ${errorMsg}. Please try again.`,
            failedText: text,
          },
        ]);
      }
    },
    [sendMessage]
  );

  const handleVoice = useCallback(
    async (blob: Blob) => {
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
            m.id === userMsg.id
              ? { ...m, content: result.transcription.transcript, isTranscribing: false }
              : m
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
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "Sorry, I couldn't process that voice message.",
          },
        ]);
      }
    },
    [sendVoice]
  );

  const isPending = sendMessage.isPending || sendVoice.isPending;
  const isWelcomeOnly = messages.length === 1 && messages[0].id === "welcome";

  // ---- Render ----------------------------------------------------------- //

  return (
    <div className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[640px] -translate-x-1/2 flex-col items-center pointer-events-none">
      {/* ------------------------------------------------------------------ */}
      {/* Bubble area — messages rise from the input bar                     */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="relative w-full pointer-events-auto"
        style={{ maxHeight: isHoveringFade ? "70vh" : BUBBLE_AREA_HEIGHT + FADE_ZONE_HEIGHT }}
      >
        {/* Fade-out gradient mask at the top */}
        <div
          className={cn(
            "absolute inset-x-0 top-0 z-10 transition-opacity duration-300",
            isHoveringFade ? "opacity-0" : "opacity-100"
          )}
          style={{ height: FADE_ZONE_HEIGHT }}
          onMouseEnter={() => setIsHoveringFade(true)}
        >
          <div className="h-full w-full bg-gradient-to-b from-background via-background/80 to-transparent" />
        </div>

        {/* Hover-exit zone — restore fade when mouse leaves the entire bubble area */}
        <div
          ref={scrollRef}
          className={cn(
            "overflow-y-auto px-4 transition-all duration-300",
            isHoveringFade ? "max-h-[70vh]" : ""
          )}
          style={{
            maxHeight: isHoveringFade ? "70vh" : BUBBLE_AREA_HEIGHT + FADE_ZONE_HEIGHT,
            maskImage: isHoveringFade
              ? "none"
              : `linear-gradient(to bottom, transparent 0px, black ${FADE_ZONE_HEIGHT}px)`,
            WebkitMaskImage: isHoveringFade
              ? "none"
              : `linear-gradient(to bottom, transparent 0px, black ${FADE_ZONE_HEIGHT}px)`,
          }}
          onMouseLeave={() => setIsHoveringFade(false)}
        >
          <div className="flex flex-col gap-3 py-4">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} onRetry={handleSend} />
            ))}

            {/* Suggestion chips on welcome screen */}
            {isWelcomeOnly && !isPending && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="rounded-xl border border-border/50 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:text-foreground hover:bg-background hover:scale-[1.02]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Typing indicator */}
            {isPending && (
              <div className="flex items-start">
                <div className="flex gap-1 rounded-2xl bg-background/80 border border-border/50 px-4 py-3">
                  <div className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                  <div className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                  <div className="size-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={scrollAnchorRef} />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Suggestion chip (above input bar)                                  */}
      {/* ------------------------------------------------------------------ */}
      {suggestion?.suggestion && isWelcomeOnly && (
        <div className="w-full px-4 pb-1 pointer-events-auto">
          <button
            type="button"
            onClick={() => handleSend(suggestion.suggestion)}
            className="flex w-full items-center gap-2 rounded-2xl border border-border/30 bg-background/80 px-4 py-2.5 text-left text-xs text-muted-foreground transition-all hover:text-foreground hover:bg-background hover:scale-[1.005]"
          >
            <Sparkles className="size-3.5 shrink-0 text-violet-400" />
            <span className="truncate">{suggestion.suggestion}</span>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Input bar — always visible at the very bottom                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="w-full px-4 pb-6 pointer-events-auto">
        {voiceState === "recording" ? (
          <div className="neu-flat flex items-center gap-3 rounded-3xl bg-background px-5 py-3.5">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex items-center justify-center" aria-hidden="true">
                <div className="size-2 rounded-full bg-red-400" />
                <div className="absolute size-4 animate-ping rounded-full bg-red-400/30" />
              </div>
              <span className="text-sm text-muted-foreground">
                {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
              </span>
            </div>
            <button
              onClick={stopRecording}
              className="flex items-center gap-1.5 rounded-xl bg-foreground/5 px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Stop recording"
            >
              <Square className="size-3" />
              Stop
            </button>
          </div>
        ) : (
          <ChatInputBar
            onSend={handleSend}
            onMicClick={async () => {
              if (voiceState === "recording") stopRecording();
              else await startRecording();
            }}
            isLoading={isPending}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Input bar
// ---------------------------------------------------------------------------

function ChatInputBar({
  onSend,
  onMicClick,
  isLoading,
}: {
  onSend: (text: string) => void;
  onMicClick: () => void;
  isLoading: boolean;
}) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="neu-flat flex items-end gap-2 rounded-3xl bg-background px-5 py-3 transition-all duration-200 focus-within:neu-pressed"
    >
      <Brain className="mb-0.5 size-5 shrink-0 text-muted-foreground" />
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask your PA anything..."
        aria-label="Message to PA"
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        disabled={isLoading}
      />
      <button
        type="button"
        onClick={onMicClick}
        className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
        disabled={isLoading}
        aria-label="Voice input"
      >
        <Mic className="size-4" />
      </button>
      <button
        type="submit"
        className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        disabled={!text.trim() || isLoading}
        aria-label="Send message"
      >
        <Send className="size-3.5" />
      </button>
    </form>
  );
}
