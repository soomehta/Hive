"use client";

import Link from "next/link";
import { Check, X, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActionDecision } from "@/hooks/use-pa";
import { ACTION_REGISTRY } from "@/lib/actions/registry";
import { getActionPreview } from "@/lib/utils/action-previews";

interface PAActionCardProps {
  action: {
    id: string;
    actionType: string;
    tier: string;
    status: string;
    plannedPayload: Record<string, unknown>;
    result?: Record<string, unknown> | null;
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

function getResultLink(actionType: string, payload: Record<string, unknown>, result?: Record<string, unknown> | null): { href: string; label: string } | null {
  const id = (result?.id ?? result?.taskId ?? result?.pageId ?? result?.channelId ?? result?.noticeId) as string | undefined;
  const projectId = payload.projectId as string | undefined;

  switch (actionType) {
    case "create_task":
    case "update_task":
    case "complete_task":
      if (projectId) return { href: `/dashboard/projects/${projectId}/tasks`, label: "View task" };
      return null;
    case "create_page":
    case "update_page":
    case "summarize_page":
    case "convert_message_to_page":
      if (id) return { href: `/dashboard/pages/${id}`, label: "Open page" };
      return null;
    case "create_channel":
    case "post_channel_message":
      return { href: "/dashboard/chat", label: "Open chat" };
    case "create_notice":
      return { href: "/dashboard/notices", label: "View notices" };
    default:
      return null;
  }
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

      {/* Structured preview */}
      {(() => {
        const preview = getActionPreview(action.actionType, action.plannedPayload);
        if (!preview) return null;
        return (
          <div className="mb-3 rounded-lg border border-border/50 bg-muted/30 p-3">
            <div className="mb-2 text-xs font-medium text-foreground">{preview.title}</div>
            <div className="space-y-1">
              {preview.fields.map((field, i) => (
                <div key={i} className="flex items-baseline gap-2 text-xs">
                  <span className="shrink-0 text-muted-foreground">{field.label}:</span>
                  <span className="text-foreground">{field.value}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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

      {/* Status badge + result link for completed/rejected actions */}
      {action.status === "executed" && (() => {
        const link = getResultLink(action.actionType, action.plannedPayload, action.result);
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">Executed</Badge>
            {link && (
              <Link href={link.href} className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                {link.label}
                <ExternalLink className="size-3" />
              </Link>
            )}
          </div>
        );
      })()}

      {action.status === "rejected" && (
        <Badge variant="outline" className="text-xs text-red-400 border-red-400/30">Rejected</Badge>
      )}
    </div>
  );
}
