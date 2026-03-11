"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
import { getActivityDescription } from "@/lib/utils/activity-descriptions";
import { relativeDate } from "@/lib/utils/dates";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  MessageSquare,
  FolderKanban,
  AlertTriangle,
  Bot,
  FileText,
  Hash,
  Link2,
  Bell,
  BarChart3,
  Activity,
} from "lucide-react";
import type { ActivityLogEntry } from "@/types";

const ACTIVITY_ICON_MAP: Record<string, { icon: React.ElementType; color: string }> = {
  task_created: { icon: Plus, color: "text-green-500" },
  task_completed: { icon: CheckCircle2, color: "text-green-600" },
  task_updated: { icon: Pencil, color: "text-blue-500" },
  task_deleted: { icon: Trash2, color: "text-red-500" },
  task_assigned: { icon: UserPlus, color: "text-violet-500" },
  task_commented: { icon: MessageSquare, color: "text-blue-400" },
  blocker_flagged: { icon: AlertTriangle, color: "text-red-500" },
  blocker_resolved: { icon: CheckCircle2, color: "text-green-500" },
  message_posted: { icon: MessageSquare, color: "text-blue-500" },
  project_created: { icon: FolderKanban, color: "text-green-500" },
  project_updated: { icon: FolderKanban, color: "text-blue-500" },
  member_joined: { icon: UserPlus, color: "text-green-500" },
  member_left: { icon: UserMinus, color: "text-gray-500" },
  pa_action_executed: { icon: Bot, color: "text-violet-500" },
  pa_report_generated: { icon: BarChart3, color: "text-violet-500" },
  page_created: { icon: FileText, color: "text-green-500" },
  page_updated: { icon: FileText, color: "text-blue-500" },
  page_restored: { icon: FileText, color: "text-amber-500" },
  notice_created: { icon: Bell, color: "text-green-500" },
  notice_pinned: { icon: Bell, color: "text-amber-500" },
  channel_created: { icon: Hash, color: "text-green-500" },
  channel_message_posted: { icon: MessageSquare, color: "text-blue-500" },
  item_linked: { icon: Link2, color: "text-blue-500" },
  item_unlinked: { icon: Link2, color: "text-gray-500" },
};

interface ActivityFeedProps {
  projectId?: string;
  limit?: number;
}

export function ActivityFeed({ projectId, limit = 10 }: ActivityFeedProps) {
  const { orgId } = useOrg();

  const { data, isLoading } = useQuery({
    queryKey: ["activity", orgId, projectId, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      params.set("limit", String(limit));
      const res = await apiClient(`/api/activity?${params}`);
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json() as Promise<{
        data: ActivityLogEntry[];
        nextCursor: string | null;
      }>;
    },
    enabled: !!orgId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const entries = data?.data ?? [];

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No activity yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const iconConfig = ACTIVITY_ICON_MAP[entry.type] ?? { icon: Activity, color: "text-muted-foreground" };
        const IconComponent = iconConfig.icon;

        return (
        <div key={entry.id} className="flex items-start gap-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ${iconConfig.color}`}>
            <IconComponent className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              {getActivityDescription(
                entry.type,
                entry.metadata as Record<string, unknown> | null
              )}
            </p>
            <p className="text-muted-foreground text-xs">
              {relativeDate(entry.createdAt)}
            </p>
          </div>
        </div>
        );
      })}
    </div>
  );
}
