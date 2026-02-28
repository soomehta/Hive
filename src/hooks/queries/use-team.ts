"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  jobTitle: string | null;
  department: string | null;
  joinedAt: string;
  displayName?: string;
  email?: string | null;
  avatarUrl?: string | null;
}

export function useTeamQuery(orgId: string | null) {
  return useQuery({
    queryKey: ["org-members", orgId],
    queryFn: async () => {
      const res = await apiClient(`/api/organizations/${orgId}/members`);
      if (!res.ok) throw new Error("Failed to fetch team members");
      const json = await res.json();
      return json.data as OrgMember[];
    },
    enabled: !!orgId,
  });
}

export function useCurrentOrgTeamQuery() {
  const { orgId } = useOrg();
  return useTeamQuery(orgId);
}
