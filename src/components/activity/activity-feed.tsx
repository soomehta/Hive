"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
import { getActivityDescription } from "@/lib/utils/activity-descriptions";
import { relativeDate } from "@/lib/utils/dates";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityLogEntry } from "@/types";

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
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-start gap-3">
          <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium">
            {(entry.userId ?? "?").slice(0, 2).toUpperCase()}
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
      ))}
    </div>
  );
}
