"use client";

import { CanvasRoot } from "@/components/canvas/canvas-root";

// ---------------------------------------------------------------------------
// DashboardPageClient
//
// The main dashboard page now renders the infinite canvas with the PA chat
// blob, notification dots, and widget system. The previous pinboard
// implementation has been replaced by the canvas-centric layout.
// ---------------------------------------------------------------------------

export function DashboardPageClient() {
  return <CanvasRoot />;
}
