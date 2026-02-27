"use client";

import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActionDecision } from "@/hooks/use-pa";
import { ACTION_REGISTRY } from "@/lib/actions/registry";

interface PAActionCardProps {
  action: {
    id: string;
    actionType: string;
    tier: string;
    status: string;
    plannedPayload: Record<string, unknown>;
  };
}

const PAYLOAD_LABELS: Record<string, string> = {
  title: "Title",
  projectId: "Project",
  dueDate: "Due date",
  priority: "Priority",
  assigneeId: "Assignee",
  description: "Description",
  status: "Status",
  content: "Content",
  channelId: "Channel",
  to: "To",
  subject: "Subject",
  body: "Body",
};

function formatValue(key: string, val: unknown): string {
  if (val === null || val === undefined) return "—";
  const str = String(val);
  if (key === "dueDate" || key === "startDate" || key === "endDate") {
    try {
      return new Date(str).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return str;
    }
  }
  if (key.endsWith("Id") && str.length > 12) return str.slice(0, 8) + "...";
  return str;
}

export function PAActionCard({ action }: PAActionCardProps) {
  const decision = useActionDecision();
  const registry = ACTION_REGISTRY[action.actionType];

  function handleApprove() {
    decision.mutate({ actionId: action.id, decision: "approve" });
  }

  function handleReject() {
    decision.mutate({ actionId: action.id, decision: "reject", rejectionReason: "User rejected" });
  }

  const isPending = decision.isPending;

  return (
    <div className="mt-2 ml-2 sm:ml-9 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs text-violet-400 border-violet-400/30">
          {registry?.description ?? action.actionType}
        </Badge>
        <Badge variant="outline" className="text-xs text-muted-foreground border-border">
          {action.tier.replace("_", " ")}
        </Badge>
      </div>

      {/* Payload preview */}
      <div className="mb-3 text-xs text-muted-foreground space-y-1">
        {Object.entries(action.plannedPayload).slice(0, 4).map(([key, val]) => (
          <div key={key}>
            <span className="text-muted-foreground">{PAYLOAD_LABELS[key] ?? key}:</span>{" "}
            <span className="text-foreground">{formatValue(key, val)}</span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {action.status === "pending" && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={isPending}
            className="h-7 gap-1 bg-green-600 text-xs hover:bg-green-700"
            aria-label={`Approve ${registry?.description ?? action.actionType}`}
          >
            {isPending ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : <Check className="size-3" aria-hidden="true" />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            disabled={isPending}
            className="h-7 gap-1 border-border text-xs text-muted-foreground hover:border-red-500 hover:text-red-400"
            aria-label={`Reject ${registry?.description ?? action.actionType}`}
          >
            <X className="size-3" aria-hidden="true" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
