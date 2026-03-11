"use client";

import { useState } from "react";
import { Bell, CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { usePAActions } from "@/hooks/use-pa";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// CanvasNotificationDots
//
// Fixed-position notification indicators that float above the PA chat blob.
// Shows:
//   1. Unread notification count (bell icon)
//   2. Pending PA action count (action items needing approval)
//
// Clicking either expands a compact notification drawer inline.
// Does NOT move when the user pans the canvas.
// ---------------------------------------------------------------------------

export function CanvasNotificationDots() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { data: pendingActions } = usePAActions();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pendingCount = Array.isArray(pendingActions)
    ? pendingActions.filter((a: any) => a.status === "pending").length
    : 0;

  const totalBadge = unreadCount + pendingCount;

  if (totalBadge === 0 && !drawerOpen) return null;

  return (
    <div className="fixed bottom-[120px] left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2">
      {/* Notification drawer (compact) */}
      {drawerOpen && (
        <div className="w-80 max-h-64 overflow-y-auto rounded-xl border bg-background/95 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Notifications
            </span>
            <button
              onClick={() => setDrawerOpen(false)}
              className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close notifications"
            >
              <X className="size-3" />
            </button>
          </div>
          <div className="divide-y">
            {/* Pending actions */}
            {pendingCount > 0 && (
              <div className="px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-500">
                  <AlertTriangle className="size-3" />
                  {pendingCount} action{pendingCount > 1 ? "s" : ""} awaiting
                  approval
                </div>
              </div>
            )}

            {/* Recent notifications */}
            {notifications.slice(0, 5).map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  markAsRead([n.id]);
                }}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50",
                  !n.isRead && "bg-muted/20"
                )}
              >
                <Info className="size-3 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-foreground/80">
                    {(n as any).title ?? (n as any).message ?? "Notification"}
                  </p>
                  {(n as any).body && (
                    <p className="truncate text-muted-foreground">
                      {(n as any).body}
                    </p>
                  )}
                </div>
                {!n.isRead && (
                  <div className="mt-1 size-1.5 shrink-0 rounded-full bg-blue-400" />
                )}
              </button>
            ))}

            {notifications.length === 0 && pendingCount === 0 && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                No notifications
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dot badges */}
      <div className="flex items-center gap-2">
        {unreadCount > 0 && (
          <button
            onClick={() => setDrawerOpen((o) => !o)}
            className="neu-subtle flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-md transition-all hover:text-foreground hover:scale-105"
            aria-label={`${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`}
          >
            <Bell className="size-3" />
            <span>{unreadCount}</span>
          </button>
        )}
        {pendingCount > 0 && (
          <button
            onClick={() => setDrawerOpen((o) => !o)}
            className="neu-subtle flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs text-amber-500 shadow-md transition-all hover:text-amber-400 hover:scale-105"
            aria-label={`${pendingCount} pending action${pendingCount > 1 ? "s" : ""}`}
          >
            <CheckCircle2 className="size-3" />
            <span>{pendingCount}</span>
          </button>
        )}
      </div>
    </div>
  );
}
