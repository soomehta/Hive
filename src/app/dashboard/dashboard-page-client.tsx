"use client";

import { useQuery } from "@tanstack/react-query";
import { useOrg } from "@/hooks/use-org";
import { apiClient } from "@/lib/utils/api-client";
import { DashboardEngine } from "@/components/dashboard/dashboard-engine";
import { PageClient as LegacyDashboard } from "./dashboard-client";
import { Skeleton } from "@/components/ui/skeleton";
import type { Pathway } from "@/types/bees";

export function DashboardPageClient() {
  const { orgId } = useOrg();

  const { data: org, isLoading } = useQuery({
    queryKey: ["org-detail", orgId],
    queryFn: async () => {
      const res = await apiClient(`/api/organizations/${orgId}`);
      if (!res.ok) return null;
      return (await res.json()) as { id: string; pathway: Pathway };
    },
    enabled: !!orgId,
  });

  if (!orgId) return <LegacyDashboard />;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 grid-cols-4">
          <Skeleton className="col-span-2 h-[300px]" />
          <Skeleton className="col-span-2 h-[300px]" />
        </div>
      </div>
    );
  }

  const pathway = org?.pathway ?? "boards";

  return <DashboardEngine pathway={pathway} />;
}
