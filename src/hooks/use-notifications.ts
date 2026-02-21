"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useOrg } from "./use-org";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types";

export function useNotifications() {
  const { orgId } = useOrg();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    if (!orgId) return;

    const supabase = supabaseRef.current;

    // Get the current user to build the per-user channel
    let userChannel: ReturnType<typeof supabase.channel> | null = null;
    let orgChannel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to user-specific notifications
      userChannel = supabase
        .channel(`notifications:${orgId}:${user.id}`)
        .on("broadcast", { event: "notification" }, ({ payload }) => {
          const notification = payload as unknown as Notification;
          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        })
        .subscribe();

      // Subscribe to org-wide notifications
      orgChannel = supabase
        .channel(`notifications:${orgId}`)
        .on("broadcast", { event: "notification" }, ({ payload }) => {
          const notification = payload as unknown as Notification;
          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        })
        .subscribe();
    }

    subscribe();

    return () => {
      if (userChannel) supabase.removeChannel(userChannel);
      if (orgChannel) supabase.removeChannel(orgChannel);
    };
  }, [orgId]);

  const markAsRead = useCallback(
    async (ids: string[]) => {
      if (!orgId) return;

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-org-id": orgId,
        },
        body: JSON.stringify({ ids }),
      });

      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - ids.length));
    },
    [orgId]
  );

  const fetchNotifications = useCallback(async () => {
    if (!orgId) return;

    const res = await fetch(`/api/notifications?limit=20`, {
      headers: { "x-org-id": orgId },
    });
    if (res.ok) {
      const { data } = await res.json();
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
    }
  }, [orgId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return { notifications, unreadCount, markAsRead, fetchNotifications };
}
