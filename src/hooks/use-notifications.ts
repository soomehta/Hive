"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useOrg } from "./use-org";
import type { Notification } from "@/types";

const MAX_RETRIES = 5;

export function useNotifications() {
  const { orgId } = useOrg();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retriesRef = useRef(0);
  const orgIdRef = useRef(orgId);

  // Keep orgIdRef in sync so the closure inside onerror can see the latest value
  useEffect(() => {
    orgIdRef.current = orgId;
  }, [orgId]);

  const connectRef = useRef<(() => void) | undefined>(undefined);

  connectRef.current = () => {
    const currentOrgId = orgIdRef.current;
    if (!currentOrgId) return;

    const es = new EventSource(
      `/api/notifications/sse?orgId=${encodeURIComponent(currentOrgId)}`
    );

    es.addEventListener("notification", (event) => {
      const notification = JSON.parse(event.data) as Notification;
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    es.onopen = () => {
      retriesRef.current = 0;
    };

    es.onerror = () => {
      es.close();
      if (retriesRef.current < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30000);
        retriesRef.current++;
        reconnectRef.current = setTimeout(() => {
          connectRef.current?.();
        }, delay);
      }
    };

    eventSourceRef.current = es;
  };

  useEffect(() => {
    if (!orgId) return;

    retriesRef.current = 0;
    connectRef.current?.();

    return () => {
      eventSourceRef.current?.close();
      clearTimeout(reconnectRef.current);
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
