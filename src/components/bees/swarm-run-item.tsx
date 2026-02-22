"use client";

import { BeeAvatar } from "./bee-avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock, Pause } from "lucide-react";
import type { BeeRunStatus, BeeType } from "@/types/bees";

interface SwarmRunItemProps {
  beeName: string;
  beeType: BeeType;
  status: BeeRunStatus;
  statusText?: string | null;
  durationMs?: number | null;
  order: number;
}

const STATUS_CONFIG: Record<
  BeeRunStatus,
  { icon: React.ElementType; label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  queued: { icon: Clock, label: "Queued", variant: "outline" },
  running: { icon: Loader2, label: "Running", variant: "default" },
  waiting_handover: { icon: Pause, label: "Handing over", variant: "secondary" },
  waiting_signal: { icon: Pause, label: "Waiting", variant: "secondary" },
  completed: { icon: CheckCircle2, label: "Done", variant: "outline" },
  failed: { icon: XCircle, label: "Failed", variant: "destructive" },
  cancelled: { icon: XCircle, label: "Cancelled", variant: "outline" },
};

export function SwarmRunItem({
  beeName,
  beeType,
  status,
  statusText,
  durationMs,
}: SwarmRunItemProps) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors">
      <BeeAvatar type={beeType} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{beeName}</span>
          <Badge variant={config.variant} className="text-xs gap-1 shrink-0">
            <StatusIcon
              className={`size-3 ${status === "running" ? "animate-spin" : ""}`}
            />
            {config.label}
          </Badge>
        </div>
        {statusText && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {statusText}
          </p>
        )}
        {durationMs != null && status === "completed" && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {(durationMs / 1000).toFixed(1)}s
          </p>
        )}
      </div>
    </div>
  );
}
