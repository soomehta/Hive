"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReportChat, type ChatMessage } from "@/components/reports/report-chat";
import { ReportExport } from "@/components/reports/report-export";
import { Send, BarChart3 } from "lucide-react";

// ─── Types ──────────────────────────────────────────────

interface ReportResponse {
  narrative: string;
  data?: Record<string, unknown>;
  generatedAt: string;
}

// ─── Suggested Questions ────────────────────────────────

const SUGGESTED_QUESTIONS = [
  "How's the team doing?",
  "What's at risk?",
  "Weekly summary",
  "Who needs help?",
  "What's our completion rate?",
  "Show me overdue tasks",
  "What blockers exist?",
  "How has velocity changed?",
];

const FOLLOW_UP_MAP: Record<string, string[]> = {
  blocker: ["Who owns each blocker?", "How long have blockers been open?", "Show me resolved blockers this week"],
  overdue: ["Which project has the most overdue tasks?", "Who has the most overdue items?", "Show me tasks due this week"],
  velocity: ["Compare velocity by project", "Show me throughput trend", "What's the average cycle time?"],
  risk: ["Show me tasks at risk of missing deadline", "Which projects are behind schedule?", "What's our burndown look like?"],
  team: ["Show me workload by team member", "Who completed the most tasks this week?", "Are any team members idle?"],
  completion: ["Break down completion by project", "Show me completion trend over time", "What's the average task age?"],
  summary: ["Drill into the biggest project", "What changed since last week?", "Show me key wins this week"],
};

function getContextualFollowUps(lastResponse: string): string[] {
  const lower = lastResponse.toLowerCase();
  const matched: string[] = [];

  for (const [keyword, questions] of Object.entries(FOLLOW_UP_MAP)) {
    if (lower.includes(keyword)) {
      matched.push(...questions);
    }
  }

  // Deduplicate and limit to 4
  const unique = [...new Set(matched)];
  if (unique.length >= 4) return unique.slice(0, 4);

  // Fill remaining slots with suggestions not yet asked
  const remaining = SUGGESTED_QUESTIONS.filter((q) => !unique.includes(q));
  return [...unique, ...remaining].slice(0, 4);
}

// ─── Page ───────────────────────────────────────────────

export function PageClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Mutation for generating a report ──────────────────
  const reportMutation = useMutation({
    mutationFn: async (question: string): Promise<ReportResponse> => {
      const res = await apiClient("/api/pa/report", {
        method: "POST",
        body: JSON.stringify({ question, format: "narrative" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? "Failed to generate report");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.narrative,
        timestamp: new Date(data.generatedAt),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error: Error) => {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `I wasn't able to generate that report. ${error.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  // ── Submit a question ─────────────────────────────────
  const handleSubmit = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || reportMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    reportMutation.mutate(trimmed);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(input);
  };

  const handleSuggestionClick = (question: string) => {
    handleSubmit(question);
  };

  // Find the last assistant message for export
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          </div>
          {lastAssistantMessage && (
            <ReportExport narrative={lastAssistantMessage.content} />
          )}
        </div>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          <EmptyState
            onSelectQuestion={handleSuggestionClick}
            isLoading={reportMutation.isPending}
          />
        ) : (
          <>
            <ReportChat
              messages={messages}
              isLoading={reportMutation.isPending}
            />
            {/* Suggested follow-ups after messages */}
            {!reportMutation.isPending && messages.length > 0 && (() => {
              const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
              const followUps = lastAssistant
                ? getContextualFollowUps(lastAssistant.content)
                : SUGGESTED_QUESTIONS.slice(0, 4);

              return (
                <div className="px-4 pb-4">
                  <p className="mb-2 text-xs text-muted-foreground">
                    Ask a follow-up:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {followUps.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSuggestionClick(q)}
                        className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t bg-background p-4">
        <form onSubmit={handleFormSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your project..."
            aria-label="Report question"
            disabled={reportMutation.isPending}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || reportMutation.isPending}
            aria-label="Send question"
          >
            <Send className="size-4" aria-hidden="true" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────

function EmptyState({
  onSelectQuestion,
  isLoading,
}: {
  onSelectQuestion: (q: string) => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-16">
      <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <BarChart3 className="size-8" />
      </div>
      <h2 className="mb-2 text-xl font-semibold">
        Ask anything about your projects
      </h2>
      <p className="mb-8 max-w-md text-center text-sm text-muted-foreground">
        Get real-time insights about team progress, blockers, workload, and
        more. Your PA will analyze all project data and provide detailed reports.
      </p>

      <div className="grid max-w-lg grid-cols-2 gap-2">
        {SUGGESTED_QUESTIONS.map((question) => (
          <button
            key={question}
            onClick={() => onSelectQuestion(question)}
            disabled={isLoading}
            className="rounded-lg border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
