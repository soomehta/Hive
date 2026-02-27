"use client";

import { Brain, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePAStore } from "@/hooks/use-pa";
import { useSwarmStore } from "@/hooks/use-swarm";
import { PAChat } from "./pa-chat";
import { SwarmPanel } from "@/components/bees/swarm-panel";

export function PAPanel() {
  const { isOpen, toggle, close } = usePAStore();
  const activeSwarmId = useSwarmStore((s) => s.activeSwarmId);

  return (
    <>
      {/* Floating toggle button */}
      {!isOpen && (
        <button
          onClick={toggle}
          className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-violet-700"
          aria-label="Open PA Assistant"
        >
          <Brain className="size-6" />
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex w-full flex-col border-l border-border bg-card shadow-2xl sm:inset-auto sm:right-0 sm:top-0 sm:h-full sm:w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Brain className="size-5 text-violet-400" />
              <h2 className="text-sm font-semibold text-foreground">PA Assistant</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={close} className="size-8 text-muted-foreground hover:text-foreground" aria-label="Close PA Assistant">
              <X className="size-4" />
            </Button>
          </div>

          {/* Swarm Panel (shown when swarm is active) */}
          {activeSwarmId && <SwarmPanel />}

          {/* Chat area */}
          <PAChat />
        </div>
      )}
    </>
  );
}
