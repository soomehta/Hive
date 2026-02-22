"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { relativeDate } from "@/lib/utils/dates";
import { getActivityDescription } from "@/lib/utils/activity-descriptions";
import type { WidgetProps } from "@/types/bees";
import type { ActivityLogEntry } from "@/types";
import {
  Activity,
  CheckSquare,
  CheckCircle2,
  Edit3,
  UserPlus,
  FolderPlus,
  MessageSquare,
  Trash2,
  UserMinus,
  Bot,
  Layers,
} from "lucide-react";

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  task_created: CheckSquare,
  task_completed: CheckCircle2,
  task_updated: Edit3,
  task_deleted: Trash2,
  task_assigned: UserPlus,
  task_commented: MessageSquare,
  message_posted: MessageSquare,
  project_created: FolderPlus,
  project_updated: Edit3,
  member_joined: UserPlus,
  member_left: UserMinus,
  pa_action_executed: Bot,
  pa_report_generated: Bot,
  bee_swarm_started: Layers,
  bee_swarm_completed: Layers,
};

const ICON_COLORS: Record<string, string> = {
  task_created: "text-blue-500",
  task_completed: "text-green-500",
  task_updated: "text-amber-500",
  task_deleted: "text-red-500",
  member_joined: "text-violet-500",
  project_created: "text-emerald-500",
  pa_action_executed: "text-violet-600",
  bee_swarm_started: "text-cyan-500",
  bee_swarm_completed: "text-cyan-600",
};

export function ActivityWidget({ orgId, isEditing }: WidgetProps) {
  const { data: activity, isLoading } = useQuery({
    queryKey: ["widget-activity", orgId],
    queryFn: async () => {
      const res = await apiClient("/api/activity?limit=15");
      if (!res.ok) throw new Error("Failed to fetch activity");
      const json = await res.json();
      return json.data as ActivityLogEntry[];
    },
    enabled: !!orgId,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <Skeleton className="mt-0.5 h-7 w-7 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activity || activity.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <Activity className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-y-auto ${isEditing ? "pointer-events-none select-none" : ""}`}>
      <div className="space-y-0 divide-y px-3">
        {activity.map((entry) => {
          const Icon = ACTIVITY_ICONS[entry.type] ?? Activity;
          const iconColor = ICON_COLORS[entry.type] ?? "text-muted-foreground";

          return (
            <div key={entry.id} className="flex items-start gap-2.5 py-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className={`h-3.5 w-3.5 ${iconColor}`} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-snug text-foreground/90">
                  {getActivityDescription(
                    entry.type as Parameters<typeof getActivityDescription>[0],
                    entry.metadata as Parameters<typeof getActivityDescription>[1]
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {relativeDate(entry.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
