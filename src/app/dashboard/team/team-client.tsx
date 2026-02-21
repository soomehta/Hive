"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Users, Mail, Briefcase, Building2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";

// ─── Types ──────────────────────────────────────────────

interface OrgMember {
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

// ─── Role Badge ─────────────────────────────────────────

const ROLE_CONFIG: Record<
  OrgMember["role"],
  { label: string; className: string }
> = {
  owner: {
    label: "Owner",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  admin: {
    label: "Admin",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  member: {
    label: "Member",
    className:
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
};

function RoleBadge({ role }: { role: OrgMember["role"] }) {
  const config = ROLE_CONFIG[role];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

// ─── Member Card ────────────────────────────────────────

function MemberCard({ member }: { member: OrgMember }) {
  const displayName = member.displayName ?? member.userId.slice(0, 8);
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardContent className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">
              {displayName}
            </p>
            <RoleBadge role={member.role} />
          </div>

          {member.jobTitle && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Briefcase className="size-3" />
              <span>{member.jobTitle}</span>
            </div>
          )}

          {member.department && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="size-3" />
              <span>{member.department}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Invite Dialog ──────────────────────────────────────

function InviteMemberDialog({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: "admin" | "member" }) => {
      const res = await apiClient(
        `/api/organizations/${orgId}/members`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to invite member");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      queryClient.invalidateQueries({ queryKey: ["org-members", orgId] });
      setOpen(false);
      setEmail("");
      setRole("member");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    inviteMutation.mutate({ email: email.trim(), role });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "admin" | "member")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Loading Skeleton ───────────────────────────────────

function TeamSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-start gap-4">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────

export function PageClient() {
  const { orgId } = useOrg();

  const {
    data: membersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: async () => {
      const res = await apiClient(
        `/api/organizations/${orgId}/members`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch team members");
      }
      const json = await res.json();
      return json.data as OrgMember[];
    },
    enabled: !!orgId,
  });

  const members = membersData ?? [];

  // Sort: owners first, then admins, then members
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">
            Manage your organization members
          </p>
        </div>
        {orgId && <InviteMemberDialog orgId={orgId} />}
      </div>

      {isLoading ? (
        <TeamSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load team members. Please try again later.
          </p>
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-lg border border-dashed">
          <EmptyState
            icon={<Users />}
            title="No team members"
            description="Invite members to start collaborating."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedMembers.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
