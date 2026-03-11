"use client";

import { useRealtimeSubscription } from "@/hooks/use-realtime";

export function RealtimeProvider() {
  useRealtimeSubscription();
  return null;
}
