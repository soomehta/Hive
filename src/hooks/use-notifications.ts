"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useOrg } from "./use-org";
import type { Notification } from "@/types";

export function useNotifications() {
  const { orgId } = useOrg();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!orgId) return;

    // EventSource doesn't support custom headers, so pass orgId as query param
    const es = new EventSource(`/api/notifications/sse?orgId=${encodeURIComponent(orgId)}`);

    es.addEventListener("notification", (event) => {
      const notification = JSON.parse(event.data) as Notification;
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    es.onerror = () => {
      es.close();
    };

    eventSourceRef.current = es;

    return () => {
      es.close();
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
