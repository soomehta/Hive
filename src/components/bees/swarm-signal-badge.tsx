"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Info,
  ShieldAlert,
  Hand,
} from "lucide-react";
import { apiClient } from "@/lib/utils/api-client";
import type { SignalType } from "@/types/bees";
import { useState } from "react";

const SIGNAL_CONFIG: Record<
  SignalType,
  { icon: React.ElementType; color: string; label: string }
> = {
  hold: { icon: Hand, color: "text-red-400", label: "Hold" },
  info: { icon: Info, color: "text-blue-400", label: "Info" },
  warning: { icon: AlertTriangle, color: "text-amber-400", label: "Warning" },
  escalate: { icon: ShieldAlert, color: "text-red-500", label: "Escalate" },
};

interface SwarmSignalBadgeProps {
  signalId: string;
  swarmId: string;
  signalType: SignalType;
  message: string;
  isResolved: boolean;
}

export function SwarmSignalBadge({
  signalId,
  swarmId,
  signalType,
  message,
  isResolved,
}: SwarmSignalBadgeProps) {
  const [resolving, setResolving] = useState(false);
  const config = SIGNAL_CONFIG[signalType];
  const Icon = config.icon;

  async function handleResolve() {
    setResolving(true);
    try {
      await apiClient(
        `/api/bees/swarms/${swarmId}/signals/${signalId}/resolve`,
        { method: "POST" }
      );
    } catch {
      // ignore
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <Icon className={`size-4 mt-0.5 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {config.label}
          </Badge>
          {isResolved && (
            <Badge variant="secondary" className="text-xs">
              Resolved
            </Badge>
          )}
        </div>
        <p className="text-xs text-foreground mt-1">{message}</p>
        {!isResolved && signalType === "hold" && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 h-7 text-xs"
            onClick={handleResolve}
            disabled={resolving}
          >
            {resolving ? "Resolving..." : "Acknowledge & Continue"}
          </Button>
        )}
      </div>
    </div>
  );
}
