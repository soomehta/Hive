"use client";

import { Check, X, Edit2, Loader2 } from "lucide-react";
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
    plannedPayload: Record<string, any>;
  };
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
    <div className="mt-2 ml-9 rounded-lg border border-zinc-700 bg-zinc-900 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs text-violet-400 border-violet-400/30">
          {registry?.description ?? action.actionType}
        </Badge>
        <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-700">
          {action.tier.replace("_", " ")}
        </Badge>
      </div>

      {/* Payload preview */}
      <div className="mb-3 text-xs text-zinc-400 space-y-1">
        {Object.entries(action.plannedPayload).slice(0, 4).map(([key, val]) => (
          <div key={key}>
            <span className="text-zinc-500">{key}:</span>{" "}
            <span className="text-zinc-300">{typeof val === "string" ? val : JSON.stringify(val)}</span>
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
          >
            {isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            disabled={isPending}
            className="h-7 gap-1 border-zinc-700 text-xs text-zinc-400 hover:border-red-500 hover:text-red-400"
          >
            <X className="size-3" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
