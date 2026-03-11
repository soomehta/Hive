"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOrg } from "@/hooks/use-org";
import { apiClient } from "@/lib/utils/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

type OrgMember = {
  userId: string;
  name?: string;
  email?: string;
  role: string;
};

interface MemberPickerProps {
  /** Called when a member is selected */
  onSelect: (userId: string, displayName: string) => void;
  /** User IDs to exclude from results (e.g. already added members) */
  excludeUserIds?: string[];
  placeholder?: string;
}

export function MemberPicker({
  onSelect,
  excludeUserIds = [],
  placeholder = "Search members...",
}: MemberPickerProps) {
  const { orgId } = useOrg();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: async () => {
      const res = await apiClient("/api/organizations/members");
      if (!res.ok) return [];
      const json = (await res.json()) as { data: OrgMember[] };
      return json.data;
    },
    enabled: !!orgId,
  });

  const filtered = useMemo(() => {
    const excludeSet = new Set(excludeUserIds);
    return members
      .filter((m) => !excludeSet.has(m.userId))
      .filter((m) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          m.name?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.userId.toLowerCase().includes(q)
        );
      });
  }, [members, excludeUserIds, search]);

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so click on item registers
          setTimeout(() => setOpen(false), 200);
        }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
          {filtered.slice(0, 10).map((m) => {
            const displayName = m.name || m.email || m.userId;
            return (
              <button
                key={m.userId}
                type="button"
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-accent/50"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur
                  onSelect(m.userId, displayName);
                  setSearch("");
                  setOpen(false);
                }}
              >
                <UserPlus className="size-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{displayName}</p>
                  {m.name && m.email && (
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
