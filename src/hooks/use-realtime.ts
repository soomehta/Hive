"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "./use-org";
import { useQueryClient } from "@tanstack/react-query";

type RealtimeEvent = {
  event: string;
  payload: Record<string, unknown>;
};

/**
 * Subscribe to Supabase Realtime broadcasts for the current org.
 * Automatically invalidates relevant TanStack Query caches when events arrive.
 */
export function useRealtimeSubscription() {
  const { orgId } = useOrg();
  const [userId, setUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const supabaseRef = useRef(createClient());

  // Resolve current user ID from Supabase auth
  useEffect(() => {
    supabaseRef.current.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  const handleEvent = useCallback(
    (msg: RealtimeEvent) => {
      const { event } = msg;

      // Invalidate relevant queries based on event type
      switch (event) {
        case "chat:message_posted":
        case "chat:message_edited":
        case "chat:message_deleted":
        case "chat:message_pinned":
        case "chat:reaction_updated":
          queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
          queryClient.invalidateQueries({ queryKey: ["chat-unread"] });
          queryClient.invalidateQueries({ queryKey: ["pinboard-home"] });
          break;

        case "chat:thread_reply":
          queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
          queryClient.invalidateQueries({ queryKey: ["thread-messages"] });
          queryClient.invalidateQueries({ queryKey: ["chat-unread"] });
          queryClient.invalidateQueries({ queryKey: ["pinboard-home"] });
          break;

        case "chat:channel_created":
        case "chat:channel_updated":
          queryClient.invalidateQueries({ queryKey: ["chat-channels"] });
          queryClient.invalidateQueries({ queryKey: ["pinboard-home"] });
          break;

        case "notice:created":
        case "notice:updated":
        case "notice:pinned":
        case "notice:archived":
          queryClient.invalidateQueries({ queryKey: ["notices"] });
          queryClient.invalidateQueries({ queryKey: ["pinboard-home"] });
          break;

        case "page:updated":
          queryClient.invalidateQueries({ queryKey: ["pages-list"] });
          break;

        case "task:created":
        case "task:updated":
        case "task:completed":
          queryClient.invalidateQueries({ queryKey: ["pinboard-home"] });
          break;

        default:
          break;
      }
    },
    [queryClient],
  );

  useEffect(() => {
    if (!orgId) return;

    const supabase = supabaseRef.current;

    // Subscribe to org-wide channel
    const orgChannel = supabase.channel(`notifications:${orgId}`);
    orgChannel
      .on("broadcast", { event: "*" }, (payload) => {
        handleEvent(payload as unknown as RealtimeEvent);
      })
      .subscribe();

    subscriptionRef.current = orgChannel;

    // Also subscribe to user-specific channel if available
    let userChannel: ReturnType<typeof supabase.channel> | null = null;
    if (userId) {
      userChannel = supabase.channel(`notifications:${orgId}:${userId}`);
      userChannel
        .on("broadcast", { event: "*" }, (payload) => {
          handleEvent(payload as unknown as RealtimeEvent);
        })
        .subscribe();
    }

    return () => {
      supabase.removeChannel(orgChannel);
      if (userChannel) supabase.removeChannel(userChannel);
    };
  }, [orgId, userId, handleEvent]);
}
