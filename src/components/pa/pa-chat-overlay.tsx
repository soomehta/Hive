"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { X, MessageSquarePlus, History, ChevronLeft, Brain } from "lucide-react";
import { useChatOverlayStore, useChatSessionMessages } from "@/hooks/use-pa";
import { useSwarmStore } from "@/hooks/use-swarm";
import { PAChat } from "./pa-chat";
import { PAChatHistory } from "./pa-chat-history";
import { SwarmPanel } from "@/components/bees/swarm-panel";

type OverlayView = "chat" | "history";

export function PAChatOverlay() {
  const { overlayOpen, closeOverlay, activeSessionId, setActiveSessionId } =
    useChatOverlayStore();
  const activeSwarmId = useSwarmStore((s) => s.activeSwarmId);
  const [view, setView] = useState<OverlayView>("chat");
  const [mounted, setMounted] = useState(false);

  // Fetch session data for title display
  const { data: sessionData } = useChatSessionMessages(activeSessionId);
  const sessionTitle = activeSessionId ? sessionData?.session?.title : null;

  useEffect(() => {
    if (overlayOpen) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMounted(true));
      });
    } else {
      setMounted(false);
    }
  }, [overlayOpen]);

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setView("chat");
  }, [setActiveSessionId]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      setView("chat");
    },
    [setActiveSessionId]
  );

  const handleSessionCreated = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
    },
    [setActiveSessionId]
  );

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = useCallback(() => {
    setMounted(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      closeOverlay();
    }, 300);
  }, [closeOverlay]);

  // Cancel pending close timer if overlay re-opens
  useEffect(() => {
    if (overlayOpen && closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [overlayOpen]);

  // Escape to close — only when not focused on a text input
  useEffect(() => {
    if (!overlayOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === "TEXTAREA" || target.tagName === "INPUT";
      if (isInInput) {
        // First Escape blurs the input; second one closes the overlay
        target.blur();
        return;
      }
      handleClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [overlayOpen, handleClose]);

  // Global keyboard shortcut: Cmd/Ctrl+J to toggle overlay
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        if (overlayOpen) {
          handleClose();
        } else {
          useChatOverlayStore.getState().openOverlay();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [overlayOpen, handleClose]);

  if (!overlayOpen) return null;

  const headerLabel = view === "history"
    ? "History"
    : sessionTitle
      ? sessionTitle
      : "New chat";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-background transition-all duration-300 ease-out ${
        mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3 min-w-0">
          {view === "history" && (
            <button
              onClick={() => setView("chat")}
              className="neu-btn flex size-8 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Back to chat"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
          <div className="neu-subtle flex size-9 shrink-0 items-center justify-center rounded-xl bg-background">
            <Brain className="size-4 text-muted-foreground" />
          </div>
          <span className="truncate text-sm font-medium text-muted-foreground tracking-wide">
            {headerLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {view === "chat" && (
            <>
              <button
                onClick={handleNewChat}
                className="neu-btn flex size-9 items-center justify-center rounded-xl bg-background text-muted-foreground transition-colors hover:text-foreground"
                aria-label="New conversation"
                title="New conversation"
              >
                <MessageSquarePlus className="size-4" />
              </button>
              <button
                onClick={() => setView("history")}
                className="neu-btn flex size-9 items-center justify-center rounded-xl bg-background text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Chat history"
                title="Chat history"
              >
                <History className="size-4" />
              </button>
            </>
          )}
          <button
            onClick={handleClose}
            className="neu-btn flex size-9 items-center justify-center rounded-xl bg-background text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close chat"
            title="Close (Esc)"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {activeSwarmId && <SwarmPanel />}

      {/* Content */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden">
        {view === "chat" ? (
          <PAChat
            sessionId={activeSessionId}
            onSessionCreated={handleSessionCreated}
          />
        ) : (
          <PAChatHistory
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
          />
        )}
      </div>

      {/* Shortcut hint */}
      <div className="flex justify-center pb-3">
        <kbd className="text-[10px] text-muted-foreground/40 font-mono">
          {typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl+"}J to toggle
        </kbd>
      </div>
    </div>
  );
}
