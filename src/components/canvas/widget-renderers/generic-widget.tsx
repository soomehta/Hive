"use client";

import type { CanvasWidget } from "@/lib/canvas/widget-types";

interface GenericWidgetProps {
  widget: CanvasWidget;
}

/**
 * Placeholder renderer used for all widget types until dedicated renderers are
 * implemented. Import and swap out in the `WIDGET_RENDERERS` map inside
 * `canvas-widget.tsx` to register a type-specific component.
 */
export function GenericWidget({ widget }: GenericWidgetProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
      <p className="text-sm font-medium text-muted-foreground">
        {widget.type} widget
      </p>
      {Object.keys(widget.data).length > 0 && (
        <pre className="max-h-40 w-full overflow-auto rounded-md bg-muted p-2 text-left text-xs text-muted-foreground">
          {JSON.stringify(widget.data, null, 2)}
        </pre>
      )}
    </div>
  );
}
