"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Bell, LogOut, Menu, Moon, Search, Sun, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useMobileNav } from "@/hooks/use-mobile-nav";
import { useNotifications } from "@/hooks/use-notifications";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { relativeDate } from "@/lib/utils/dates";
import { CommandPalette } from "@/components/shared/command-palette";

interface HeaderProps {
  user: { id: string; email: string; fullName: string };
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/projects": "Projects",
  "/dashboard/my-tasks": "My Tasks",
  "/dashboard/team": "Team",
  "/dashboard/settings": "Settings",
  "/dashboard/integrations": "Integrations",
  "/dashboard/reports": "Reports",
  "/dashboard/settings/profile": "Profile",
  "/dashboard/settings/pa": "PA Settings",
};

/** Map of dynamic route segments to contextual titles */
const dynamicSegmentTitles: Record<string, string> = {
  tasks: "Tasks",
  messages: "Messages",
  settings: "Project Settings",
  new: "New Project",
};

function getPageTitle(pathname: string): string {
  // Check exact match first
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }

  const segments = pathname.split("/").filter(Boolean);

  // Handle dynamic project routes: /dashboard/projects/[id]/tasks etc.
  if (segments.length >= 4 && segments[1] === "projects") {
    const subPage = segments[3];
    if (dynamicSegmentTitles[subPage]) {
      return dynamicSegmentTitles[subPage];
    }
    return "Project";
  }

  // Handle /dashboard/projects/[id]
  if (segments.length === 3 && segments[1] === "projects") {
    return "Project";
  }

  // Check prefix matches for nested routes
  if (segments.length >= 2) {
    const parentPath = `/${segments[0]}/${segments[1]}`;
    if (pageTitles[parentPath]) {
      return pageTitles[parentPath];
    }
  }

  return "Dashboard";
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { theme, setTheme } = useTheme();
  const pageTitle = getPageTitle(pathname);
  const toggleMobileNav = useMobileNav((s) => s.toggle);

  function cycleTheme() {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  async function handleMarkAllRead() {
    const unreadIds = notifications
      .filter((n) => !n.isRead)
      .map((n) => n.id);
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6">
      {/* Left: Hamburger (mobile only) + Page title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleMobileNav}
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>
        <h1 className="text-lg font-semibold">{pageTitle}</h1>
      </div>

      {/* Right: Search + Theme + Notifications + User menu */}
      <div className="flex items-center gap-2">
        {/* Command palette (rendered once) */}
        <CommandPalette />

        {/* Search trigger */}
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex text-muted-foreground gap-2"
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
        >
          <Search className="size-3.5" />
          <span className="text-xs">Search...</span>
          <kbd className="pointer-events-none ml-1 hidden select-none rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
            ⌘K
          </kbd>
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleTheme}
          aria-label="Toggle theme"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* Notification bell */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
            >
              <Bell className="size-4" aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white"
                  aria-hidden="true"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                notifications.slice(0, 20).map((notification) => {
                  const meta = notification.metadata as Record<string, string> | null;
                  const notifLink = meta?.link
                    ?? (meta?.taskId && meta?.projectId
                      ? `/dashboard/projects/${meta.projectId}/tasks`
                      : meta?.projectId
                      ? `/dashboard/projects/${meta.projectId}`
                      : null);

                  async function handleNotifClick() {
                    if (!notification.isRead) {
                      await markAsRead([notification.id]);
                    }
                    if (notifLink) {
                      router.push(notifLink);
                    }
                  }

                  return (
                    <button
                      key={notification.id}
                      onClick={handleNotifClick}
                      className={`w-full border-b px-4 py-3 text-left last:border-b-0 transition-colors hover:bg-muted/70 ${
                        !notification.isRead ? "bg-muted/50" : ""
                      } ${notifLink ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <p className="text-sm">{notification.title}</p>
                      {notification.body && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {notification.body}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {relativeDate(notification.createdAt)}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
            {notifications.length > 0 && (
              <div className="border-t px-4 py-2">
                <button
                  onClick={() => router.push("/dashboard/notifications")}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground w-full text-center"
                >
                  View all notifications
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <UserAvatar name={user.fullName} size="sm" />
              <span className="sr-only">User menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">{user.fullName}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {user.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/settings")}
            >
              <User className="size-4" />
              Profile & Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} variant="destructive">
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
