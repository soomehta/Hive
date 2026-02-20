"use client";

import { useState } from "react";
import { Send, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";

interface PAInputProps {
  onSend: (text: string) => void;
  onVoice: (blob: Blob) => void;
  isLoading: boolean;
}

export function PAInput({ onSend, onVoice, isLoading }: PAInputProps) {
  const [text, setText] = useState("");
  const { state, startRecording, stopRecording, audioBlob, duration } = useVoiceRecorder();

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
      // audioBlob will be available after stopRecording via the hook
      // We use an effect-like pattern -- check after a tick
      setTimeout(() => {
        const recorder = document.querySelector("[data-voice-blob]");
      }, 100);
    } else {
      await startRecording();
    }
  }

  // Send audio when blob is ready
  if (audioBlob && state === "idle") {
    onVoice(audioBlob);
    // Reset handled by re-render
  }

  if (state === "recording") {
    return (
      <div className="flex items-center gap-3 border-t border-zinc-800 px-4 py-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="size-2 animate-pulse rounded-full bg-red-500" />
          <span className="text-sm text-zinc-300">
            Recording... {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
          </span>
        </div>
        <Button
          size="sm"
          variant="destructive"
          onClick={stopRecording}
          className="rounded-full"
        >
          Stop
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-zinc-800 px-4 py-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask your PA..."
        rows={1}
        className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        disabled={isLoading}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={handleMicClick}
        className="size-9 shrink-0 text-zinc-400 hover:text-violet-400"
        disabled={isLoading}
      >
        <Mic className="size-4" />
      </Button>
      <Button
        type="submit"
        size="icon"
        className="size-9 shrink-0 bg-violet-600 hover:bg-violet-700"
        disabled={!text.trim() || isLoading}
      >
        <Send className="size-4" />
      </Button>
    </form>
  );
}
