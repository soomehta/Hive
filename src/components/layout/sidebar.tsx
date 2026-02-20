"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Settings,
  BarChart3,
  Plug,
  Plus,
} from "lucide-react";
import { useOrg } from "@/hooks/use-org";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarOrg {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
  joinedAt: Date;
}

interface SidebarProps {
  orgs: SidebarOrg[];
  user: { id: string; email: string; fullName: string };
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "My Tasks", href: "/dashboard/my-tasks", icon: CheckSquare },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug },
  { label: "Team", href: "/dashboard/team", icon: Users },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar({ orgs, user }: SidebarProps) {
  const pathname = usePathname();
  const { orgId, setOrg } = useOrg();

  // Default to first org if none selected
  useEffect(() => {
    if (!orgId && orgs.length > 0) {
      setOrg(orgs[0].id, orgs[0].name);
    }
  }, [orgId, orgs, setOrg]);

  function handleOrgChange(value: string) {
    const org = orgs.find((o) => o.id === value);
    if (org) {
      setOrg(org.id, org.name);
    }
  }

  function isActive(href: string): boolean {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex w-64 flex-col border-r bg-zinc-950 text-zinc-100">
      {/* Brand */}
      <div className="flex h-14 items-center px-5">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight">
          Hive
        </Link>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Org switcher */}
      <div className="px-3 py-3">
        <Select value={orgId ?? undefined} onValueChange={handleOrgChange}>
          <SelectTrigger className="w-full border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800">
            <SelectValue placeholder="Select organization" />
          </SelectTrigger>
          <SelectContent>
            {orgs.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-zinc-800" />

      {/* Quick actions */}
      <div className="px-3 py-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          asChild
        >
          <Link href="/dashboard/projects?new=true">
            <Plus className="size-4" />
            New Project
          </Link>
        </Button>
      </div>

      {/* User info */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <p className="truncate text-sm font-medium text-zinc-200">
          {user.fullName}
        </p>
        <p className="truncate text-xs text-zinc-500">{user.email}</p>
      </div>
    </aside>
  );
}
