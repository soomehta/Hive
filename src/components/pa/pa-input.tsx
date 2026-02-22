"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { toast } from "sonner";

interface PAInputProps {
  onSend: (text: string) => void;
  onVoice: (blob: Blob) => void;
  isLoading: boolean;
}

export function PAInput({ onSend, onVoice, isLoading }: PAInputProps) {
  const [text, setText] = useState("");
  const { state, startRecording, stopRecording, audioBlob, duration, error } = useVoiceRecorder();
  const sentBlobRef = useRef<Blob | null>(null);

  // Surface voice recorder errors via toast (U3)
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (audioBlob && state === "idle" && audioBlob !== sentBlobRef.current) {
      sentBlobRef.current = audioBlob;
      onVoice(audioBlob);
    }
  }, [audioBlob, state, onVoice]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText("");
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
      <div className="flex items-center gap-3 border-t border-border px-4 py-3" role="status" aria-label="Recording in progress">
        <div className="flex flex-1 items-center gap-2">
          <div className="size-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
          <span className="text-sm text-foreground">
            Recording... {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
          </span>
        </div>
        <Button
          size="sm"
          variant="destructive"
          onClick={stopRecording}
          className="rounded-full"
          aria-label="Stop recording"
        >
          Stop
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border px-4 py-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask your PA..."
        aria-label="Message to PA"
        rows={1}
        className="flex-1 resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        disabled={isLoading}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={handleMicClick}
        className="size-9 shrink-0 text-muted-foreground hover:text-violet-400"
        disabled={isLoading}
        aria-label="Voice input"
      >
        <Mic className="size-4" aria-hidden="true" />
      </Button>
      <Button
        type="submit"
        size="icon"
        className="size-9 shrink-0 bg-violet-600 hover:bg-violet-700"
        disabled={!text.trim() || isLoading}
        aria-label="Send message"
      >
        <Send className="size-4" aria-hidden="true" />
      </Button>
    </form>
  );
}
