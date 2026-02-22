"use client";

import { Mic, Square, Loader2 } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";

interface PAVoiceRecorderProps {
  onTranscript: (blob: Blob) => void;
  isProcessing?: boolean;
}

export function PAVoiceRecorder({ onTranscript, isProcessing }: PAVoiceRecorderProps) {
  const { state, startRecording, stopRecording, audioBlob, duration, error } = useVoiceRecorder();

  // Send blob when available
  if (audioBlob && state === "idle" && !isProcessing) {
    onTranscript(audioBlob);
  }

  if (isProcessing) {
    return (
      <div role="status" aria-label="Transcribing audio" className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3">
        <Loader2 className="size-5 animate-spin text-violet-400" aria-hidden="true" />
        <span className="text-sm text-zinc-400">Transcribing...</span>
      </div>
    );
  }

  if (state === "recording") {
    return (
      <button
        onClick={stopRecording}
        aria-label={`Stop recording. Duration: ${Math.floor(duration / 60)} minutes ${duration % 60} seconds`}
        className="flex w-full items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-left transition-colors hover:bg-red-500/20"
      >
        <Square className="size-5 text-red-400" aria-hidden="true" />
        <div className="flex flex-1 items-center gap-2">
          <div className="flex gap-0.5" aria-hidden="true">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-0.5 animate-pulse rounded-full bg-red-400"
                style={{
                  height: `${8 + Math.random() * 12}px`,
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>
          <span className="text-sm text-zinc-300" role="timer" aria-live="off">
            {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={startRecording}
      aria-label="Start voice recording"
      className="flex w-full items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-left transition-colors hover:border-violet-500/50 hover:bg-zinc-800"
    >
      <Mic className="size-5 text-zinc-400" aria-hidden="true" />
      <span className="text-sm text-zinc-400">Tap to speak to your PA</span>
      {error && <span className="text-xs text-red-400" role="alert">{error}</span>}
    </button>
  );
}
