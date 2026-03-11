"use client";

import { useState, useEffect } from "react";
import { Bot, Play, Calendar, FileText } from "lucide-react";
import { useOrg } from "@/hooks/use-org";
import { useWorkspace } from "@/hooks/use-workspace";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Report {
  id: string;
  reportType: string;
  title: string;
  content: string;
  createdAt: string;
}

type TriggerType = "daily_standup" | "weekly_report";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PMAgentPage() {
  const { orgId } = useOrg();
  const { activeWorkspaceId } = useWorkspace();

  const [reports, setReports] = useState<Report[]>([]);
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  // Load past reports for the active workspace.
  useEffect(() => {
    if (!orgId || !activeWorkspaceId) return;

    fetch(`/api/agents/pm/${activeWorkspaceId}/reports`, {
      headers: { "x-org-id": orgId },
    })
      .then((r) => r.json())
      .then((data) => setReports(data.data ?? []))
      .catch(() => {
        // Non-fatal — the list stays empty and the user can retry.
      });
  }, [orgId, activeWorkspaceId]);

  // Manually trigger a PM Agent run.
  async function handleTrigger(type: TriggerType) {
    if (!orgId || !activeWorkspaceId || triggering) return;

    setTriggering(true);
    setTriggerError(null);

    try {
      const res = await fetch(
        `/api/agents/pm/${activeWorkspaceId}/trigger`,
        {
          method: "POST",
          headers: {
            "x-org-id": orgId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ scheduleType: type }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setTriggerError(
          (err as { error?: string }).error ?? "Trigger failed. Please retry."
        );
      }
    } catch {
      setTriggerError("Network error. Please check your connection.");
    } finally {
      setTriggering(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
            aria-hidden="true"
          >
            <Bot className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">PM Agent</h1>
            <p className="text-sm text-muted-foreground">
              Automated standups, reports &amp; check-ins
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleTrigger("daily_standup")}
            disabled={triggering || !activeWorkspaceId}
            aria-busy={triggering}
            className="neu-btn flex items-center gap-2 rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="size-4" aria-hidden="true" />
            Run Standup
          </button>
          <button
            onClick={() => handleTrigger("weekly_report")}
            disabled={triggering || !activeWorkspaceId}
            aria-busy={triggering}
            className="neu-btn flex items-center gap-2 rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="size-4" aria-hidden="true" />
            Run Report
          </button>
        </div>
      </div>

      {/* ─── Trigger error banner ─── */}
      {triggerError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {triggerError}
        </div>
      )}

      {/* ─── No active workspace guard ─── */}
      {!activeWorkspaceId && (
        <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
          Select a workspace to view PM Agent reports.
        </div>
      )}

      {/* ─── Reports list ─── */}
      {activeWorkspaceId && (
        <section aria-labelledby="reports-heading" className="space-y-4">
          <h2 id="reports-heading" className="text-lg font-medium">
            Recent Reports
          </h2>

          {reports.length === 0 ? (
            <div className="rounded-xl border p-8 text-center text-muted-foreground">
              <Calendar
                className="mx-auto mb-2 size-8 opacity-50"
                aria-hidden="true"
              />
              <p>
                No reports yet. Trigger a standup or wait for the scheduled
                run.
              </p>
            </div>
          ) : (
            <ul className="space-y-4" role="list">
              {reports.map((report) => (
                <li
                  key={report.id}
                  className="space-y-2 rounded-xl border p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        {report.reportType.replace(/_/g, " ")}
                      </span>
                      <h3 className="font-medium">{report.title}</h3>
                    </div>
                    <time
                      dateTime={report.createdAt}
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      {new Date(report.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {report.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
