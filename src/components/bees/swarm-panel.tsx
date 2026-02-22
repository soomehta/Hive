"use client";

import { useSwarmStore, useSwarmSSE } from "@/hooks/use-swarm";
import { SwarmRunItem } from "./swarm-run-item";
import { SwarmHandoverArrow } from "./swarm-handover-arrow";
import { SwarmSignalBadge } from "./swarm-signal-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { apiClient } from "@/lib/utils/api-client";
import type { BeeType, BeeRunStatus } from "@/types/bees";

export function SwarmPanel() {
  const {
    activeSwarmId,
    status,
    runs,
    signals,
    handovers,
    result,
    reset,
  } = useSwarmStore();

  // Subscribe to SSE updates
  useSwarmSSE(activeSwarmId);

  if (!activeSwarmId) return null;

  const isActive = status === "running" || status === "planning";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  async function handleCancel() {
    if (!activeSwarmId) return;
    await apiClient(`/api/bees/swarms/${activeSwarmId}/cancel`, {
      method: "POST",
    });
    reset();
  }

  return (
    <div className="border-t border-border bg-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          {isActive && <Loader2 className="size-4 animate-spin text-violet-400" />}
          {isCompleted && <CheckCircle2 className="size-4 text-emerald-400" />}
          {isFailed && <XCircle className="size-4 text-red-400" />}
          <span className="text-xs font-medium">
            Bee Swarm
          </span>
          <Badge variant="outline" className="text-xs">
            {runs.length} {runs.length === 1 ? "bee" : "bees"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {isActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}
          {!isActive && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={reset}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[300px] overflow-y-auto p-3 space-y-2">
        {/* Signals */}
        {signals.map((signal) => (
          <SwarmSignalBadge
            key={signal.id}
            signalId={signal.id}
            swarmId={activeSwarmId}
            signalType={signal.signalType as any}
            message={signal.message}
            isResolved={signal.isResolved}
          />
        ))}

        {/* Bee runs with handover arrows */}
        {runs.map((run, i) => {
          const handover = handovers.find(
            (h) => h.toBeeRunId === run.id
          );
          const prevRun = i > 0 ? runs[i - 1] : null;

          return (
            <div key={run.id}>
              {handover && prevRun && (
                <SwarmHandoverArrow
                  fromName={prevRun.statusText ?? "Previous bee"}
                  toName={run.statusText ?? "Next bee"}
                  summary={
                    typeof handover.summary === "string"
                      ? handover.summary
                      : ""
                  }
                />
              )}
              <SwarmRunItem
                beeName={run.statusText ?? `Bee ${i + 1}`}
                beeType={(run as any).beeType ?? "operator"}
                status={run.status as BeeRunStatus}
                statusText={run.statusText}
                durationMs={run.durationMs}
                order={run.order}
              />
            </div>
          );
        })}

        {/* Empty state */}
        {runs.length === 0 && isActive && (
          <div className="flex items-center justify-center py-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Assembling bee swarm...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
