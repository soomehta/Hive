"use client";

import React from "react";
import { useCanvasStore } from "@/hooks/use-canvas-store";

// ---------------------------------------------------------------------------
// MinimizedWidgetTray
//
// Fixed-position horizontal tray at the bottom of the canvas viewport that
// lists all minimised widgets as icon-chips. Clicking a chip calls
// restoreWidget() to expand it back to its full size on the canvas.
//
// The tray does not move when the user pans — it is rendered outside the
// transformed canvas layer in canvas-root.tsx.
// ---------------------------------------------------------------------------

export function MinimizedWidgetTray() {
  const widgets = useCanvasStore((s) => s.widgets);
  const restoreWidget = useCanvasStore((s) => s.restoreWidget);

  const minimized = widgets.filter((w) => w.minimized);

  if (minimized.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1.5 shadow-lg backdrop-blur-sm">
      {minimized.map((widget) => (
        <button
          key={widget.id}
          type="button"
          onClick={() => restoreWidget(widget.id)}
          className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label={`Restore ${widget.type} widget`}
        >
          {widget.type}
        </button>
      ))}
    </div>
  );
}
