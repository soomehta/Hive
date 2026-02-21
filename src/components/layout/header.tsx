"use client";

import { useRouter, usePathname } from "next/navigation";
import { Bell, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

function getPageTitle(pathname: string): string {
  // Check exact match first
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }

  // Check prefix matches for nested routes
  const segments = pathname.split("/").filter(Boolean);
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
  const pageTitle = getPageTitle(pathname);

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
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      {/* Left: Page title */}
      <div>
        <h1 className="text-lg font-semibold">{pageTitle}</h1>
      </div>

      {/* Right: Notifications + User menu */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              <span className="sr-only">Notifications</span>
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
