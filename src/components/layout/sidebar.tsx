"use client";

import { useEffect, useState } from "react";
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
  Bot,
  MessageSquare,
  StickyNote,
  Hexagon,
  FileText,
  Layers,
  BrainCircuit,
  CalendarDays,
  Mic,
} from "lucide-react";
import { useOrg } from "@/hooks/use-org";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { featureFlags } from "@/lib/utils/feature-flags";

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

interface SidebarContentProps extends SidebarProps {
  onNavigate?: () => void;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "My Tasks", href: "/dashboard/my-tasks", icon: CheckSquare },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { label: "Meetings", href: "/dashboard/meetings", icon: Mic },
  ...(featureFlags.chat ? [{ label: "Chat", href: "/dashboard/chat", icon: MessageSquare }] : []),
  ...(featureFlags.chat ? [{ label: "Notices", href: "/dashboard/notices", icon: StickyNote }] : []),
  ...(featureFlags.canvas ? [{ label: "Pages", href: "/dashboard/pages", icon: FileText }] : []),
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug },
  { label: "Team", href: "/dashboard/team", icon: Users },
  { label: "PM Agent", href: "/dashboard/agents/pm", icon: BrainCircuit },
  { label: "Bees", href: "/dashboard/settings/bees", icon: Bot },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function SidebarContent({ orgs, user, onNavigate }: SidebarContentProps) {
  const pathname = usePathname();
  const { orgId, setOrg } = useOrg();
  const { activeWorkspaceId, activeWorkspaceName, setWorkspace } = useWorkspace();
  const [workspaceList, setWorkspaceList] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!orgId && orgs.length > 0) {
      setOrg(orgs[0].id, orgs[0].name);
    }
  }, [orgId, orgs, setOrg]);

  function isActive(href: string): boolean {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (href === "/dashboard/settings" && (pathname.startsWith("/dashboard/settings/bees") || pathname.startsWith("/dashboard/settings/checkins"))) {
      return false;
    }
    if (href === "/dashboard/settings" && pathname.startsWith("/dashboard/agents")) {
      return false;
    }
    return pathname.startsWith(href);
  }

  // Cycle through orgs on logo click
  function handleOrgCycle() {
    if (orgs.length <= 1) return;
    const currentIndex = orgs.findIndex((o) => o.id === orgId);
    const nextIndex = (currentIndex + 1) % orgs.length;
    setOrg(orgs[nextIndex].id, orgs[nextIndex].name);
  }

  // Fetch workspaces when org changes
  useEffect(() => {
    if (!orgId) return;
    fetch("/api/workspaces", { headers: { "x-org-id": orgId } })
      .then((r) => r.json())
      .then((data) => {
        const list = data.data ?? [];
        setWorkspaceList(list);
        if (!activeWorkspaceId && list.length > 0) {
          const defaultWs = list.find((w: { isDefault?: boolean }) => w.isDefault) || list[0];
          setWorkspace(defaultWs.id, defaultWs.name);
        }
      })
      .catch(() => {});
  }, [orgId, activeWorkspaceId, setWorkspace]);

  function handleWorkspaceCycle() {
    if (workspaceList.length <= 1) return;
    const currentIndex = workspaceList.findIndex((w) => w.id === activeWorkspaceId);
    const nextIndex = (currentIndex + 1) % workspaceList.length;
    setWorkspace(workspaceList[nextIndex].id, workspaceList[nextIndex].name);
  }

  const currentOrg = orgs.find((o) => o.id === orgId);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full flex-col items-center py-4 gap-1">
        {/* Brand / Org switcher */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleOrgCycle}
              className="neu-flat mb-3 flex size-10 items-center justify-center rounded-2xl bg-background transition-all hover:scale-105"
              aria-label={`Switch organization (current: ${currentOrg?.name ?? "none"})`}
            >
              <Hexagon className="size-5 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            <p className="font-medium">{currentOrg?.name ?? "Hive"}</p>
            {orgs.length > 1 && (
              <p className="text-xs text-muted-foreground">Click to switch</p>
            )}
          </TooltipContent>
        </Tooltip>

        {/* Workspace switcher */}
        {workspaceList.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleWorkspaceCycle}
                className="neu-flat mb-3 flex size-10 items-center justify-center rounded-2xl bg-background transition-all hover:scale-105"
                aria-label={`Switch workspace (current: ${activeWorkspaceName ?? "none"})`}
              >
                <Layers className="size-5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              <p className="font-medium">{activeWorkspaceName ?? "Workspace"}</p>
              {workspaceList.length > 1 && (
                <p className="text-xs text-muted-foreground">Click to switch</p>
              )}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Navigation */}
        <nav aria-label="Main navigation" className="flex flex-1 flex-col items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-2xl transition-all duration-200",
                      active
                        ? "neu-pressed bg-background text-foreground"
                        : "neu-subtle bg-background text-muted-foreground hover:text-foreground hover:scale-105"
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Quick add */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/dashboard/projects/new"
              onClick={onNavigate}
              aria-label="New Project"
              className="neu-btn mb-2 flex size-10 items-center justify-center rounded-2xl bg-background text-muted-foreground transition-all hover:text-foreground hover:scale-105"
            >
              <Plus className="size-[18px]" aria-hidden="true" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            New Project
          </TooltipContent>
        </Tooltip>

        {/* User avatar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="neu-flat flex size-10 items-center justify-center rounded-2xl bg-background">
              <span className="text-xs font-medium text-muted-foreground">
                {user.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            <p className="font-medium">{user.fullName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export function Sidebar({ orgs, user }: SidebarProps) {
  return (
    <aside className="hidden w-[72px] flex-col bg-background lg:flex">
      <SidebarContent orgs={orgs} user={user} />
    </aside>
  );
}
