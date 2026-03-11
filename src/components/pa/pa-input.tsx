"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, Square } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { toast } from "sonner";

interface PAInputProps {
  onSend: (text: string) => void;
  onVoice: (blob: Blob) => void;
  isLoading: boolean;
  autoFocus?: boolean;
}

export function PAInput({ onSend, onVoice, isLoading, autoFocus }: PAInputProps) {
  const [text, setText] = useState("");
  const { state, startRecording, stopRecording, audioBlob, duration, error } = useVoiceRecorder();
  const sentBlobRef = useRef<Blob | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (error) toast.error("Microphone access failed. Please check your permissions.");
  }, [error]);

  useEffect(() => {
    if (audioBlob && state === "idle" && audioBlob !== sentBlobRef.current) {
      sentBlobRef.current = audioBlob;
      onVoice(audioBlob);
    }
  }, [audioBlob, state, onVoice]);

  // Auto-focus when overlay opens
  useEffect(() => {
    if (autoFocus) {
      // Small delay to let the overlay animation start
      const timer = setTimeout(() => textareaRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Auto-resize textarea
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
    // Reset height
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  async function handleMicClick() {
    if (state === "recording") {
      stopRecording();
    } else {
      await startRecording();
    }
  }

  if (state === "recording") {
    return (
      <div className="flex items-center gap-3 px-5 py-4" role="status" aria-label="Recording in progress">
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
          className="neu-btn flex items-center gap-1.5 rounded-xl bg-background px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Stop recording"
        >
          <Square className="size-3" />
          Stop
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 px-5 py-4">
      <div className="neu-pressed flex flex-1 items-center gap-2 rounded-2xl bg-background px-4 py-2.5">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask your PA..."
          aria-label="Message to PA"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          disabled={isLoading}
        />
      </div>
      <button
        type="button"
        onClick={handleMicClick}
        className="neu-btn flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground transition-colors hover:text-foreground"
        disabled={isLoading}
        aria-label="Voice input"
      >
        <Mic className="size-4" />
      </button>
      <button
        type="submit"
        className="neu-btn flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        disabled={!text.trim() || isLoading}
        aria-label="Send message"
      >
        <Send className="size-3.5" />
      </button>
    </form>
  );
}
