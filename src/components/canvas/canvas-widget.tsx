"use client";

import { useCallback, useRef, useState } from "react";
import { GripVertical, Maximize2, Minus, X } from "lucide-react";

import type { CanvasWidget, WidgetType } from "@/lib/canvas/widget-types";
import { useCanvasStore } from "@/hooks/use-canvas-store";
import { Button } from "@/components/ui/button";
import { GenericWidget } from "./widget-renderers/generic-widget";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

/** Height of the title bar in pixels — must stay in sync with `h-10` below. */
const TITLE_BAR_HEIGHT = 40;

const MIN_WIDTH = 280;
const MIN_HEIGHT = 200;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;

// ---------------------------------------------------------------------------
// Widget renderer registry
// ---------------------------------------------------------------------------

type WidgetRenderer = React.ComponentType<{ widget: CanvasWidget }>;

/**
 * Maps each WidgetType to its dedicated renderer component.
 *
 * This map is exported so external modules can swap in type-specific renderers
 * without modifying this file:
 *
 * @example
 *   import { WIDGET_RENDERERS } from "@/components/canvas/canvas-widget";
 *   WIDGET_RENDERERS["task-list"] = TaskListWidget;
 */
export const WIDGET_RENDERERS: Record<WidgetType, WidgetRenderer> = {
  "project-card": GenericWidget,
  "task-list": GenericWidget,
  "task-detail": GenericWidget,
  report: GenericWidget,
  briefing: GenericWidget,
  calendar: GenericWidget,
  generic: GenericWidget,
};

/** Human-readable title shown in the title bar for each widget type. */
const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  "project-card": "Project",
  "task-list": "Task List",
  "task-detail": "Task Detail",
  report: "Report",
  briefing: "Briefing",
  calendar: "Calendar",
  generic: "Widget",
};

// ---------------------------------------------------------------------------
// Resize handle
// ---------------------------------------------------------------------------

/**
 * South-east resize affordance rendered at the bottom-right corner of the
 * widget. Pointer events are handled by the parent via prop forwarding so the
 * parent keeps full control over capture / release lifecycle.
 */
function ResizeHandle({
  onPointerDown,
}: {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      aria-hidden="true"
      onPointerDown={onPointerDown}
      className="absolute bottom-0 right-0 flex h-4 w-4 cursor-se-resize items-end justify-end pb-0.5 pr-0.5"
    >
      {/* Three-dot grip icon that mirrors a classic SE resize affordance. */}
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        className="text-muted-foreground/40"
        aria-hidden="true"
      >
        <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
        <circle cx="4.5" cy="8.5" r="1.2" fill="currentColor" />
        <circle cx="8.5" cy="4.5" r="1.2" fill="currentColor" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CanvasWidget
// ---------------------------------------------------------------------------

interface CanvasWidgetProps {
  widget: CanvasWidget;
}

export function CanvasWidget({ widget }: CanvasWidgetProps) {
  // ---- Store actions ----------------------------------------------------- //

  const bringToFront = useCanvasStore((s) => s.bringToFront);
  const removeWidget = useCanvasStore((s) => s.removeWidget);
  const minimizeWidget = useCanvasStore((s) => s.minimizeWidget);
  const restoreWidget = useCanvasStore((s) => s.restoreWidget);

  // ---- Drag -------------------------------------------------------------- //

  const [isDragging, setIsDragging] = useState(false);

  /**
   * Stores the pointer position and widget top-left at the moment the drag
   * starts so subsequent move events can compute a clean delta.
   */
  const dragOrigin = useRef<{
    pointerX: number;
    pointerY: number;
    widgetX: number;
    widgetY: number;
  } | null>(null);

  const handleTitlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      bringToFront(widget.id);
      setIsDragging(true);

      dragOrigin.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        widgetX: widget.position.x,
        widgetY: widget.position.y,
      };

      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [widget.id, widget.position.x, widget.position.y, bringToFront]
  );

  const handleTitlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragOrigin.current) return;

      const dx = e.clientX - dragOrigin.current.pointerX;
      const dy = e.clientY - dragOrigin.current.pointerY;

      useCanvasStore.getState().updateWidgetPosition(widget.id, {
        x: dragOrigin.current.widgetX + dx,
        y: dragOrigin.current.widgetY + dy,
      });
    },
    [widget.id]
  );

  const handleTitlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      setIsDragging(false);
      dragOrigin.current = null;
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    },
    [isDragging]
  );

  // ---- Resize ------------------------------------------------------------ //

  const [isResizing, setIsResizing] = useState(false);

  const resizeOrigin = useRef<{
    pointerX: number;
    pointerY: number;
    width: number;
    height: number;
  } | null>(null);

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      bringToFront(widget.id);
      setIsResizing(true);

      resizeOrigin.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        width: widget.size.width,
        height: widget.size.height,
      };

      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [widget.id, widget.size.width, widget.size.height, bringToFront]
  );

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!resizeOrigin.current) return;

      const dx = e.clientX - resizeOrigin.current.pointerX;
      const dy = e.clientY - resizeOrigin.current.pointerY;

      const newWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, resizeOrigin.current.width + dx)
      );
      const newHeight = Math.min(
        MAX_HEIGHT,
        Math.max(MIN_HEIGHT, resizeOrigin.current.height + dy)
      );

      useCanvasStore.getState().updateWidgetSize(widget.id, {
        width: newWidth,
        height: newHeight,
      });
    },
    [widget.id]
  );

  const handleResizePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isResizing) return;
      setIsResizing(false);
      resizeOrigin.current = null;
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    },
    [isResizing]
  );

  // ---- Focus / bring-to-front -------------------------------------------- //

  /**
   * Clicking anywhere on the widget shell brings it to the front.
   * Propagation is stopped here so the canvas-root pan handler is not
   * triggered inadvertently.
   */
  const handleWidgetPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      bringToFront(widget.id);
    },
    [widget.id, bringToFront]
  );

  // ---- Minimize / restore ------------------------------------------------ //

  const handleMinimize = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (widget.minimized) {
        restoreWidget(widget.id);
      } else {
        minimizeWidget(widget.id);
      }
    },
    [widget.id, widget.minimized, minimizeWidget, restoreWidget]
  );

  // ---- Close ------------------------------------------------------------- //

  const handleClose = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      removeWidget(widget.id);
    },
    [widget.id, removeWidget]
  );

  // ---- Renderer selection ------------------------------------------------ //

  const WidgetRenderer = WIDGET_RENDERERS[widget.type] ?? GenericWidget;
  const typeLabel = WIDGET_TYPE_LABELS[widget.type] ?? widget.type;

  // Height available to the content area (full height minus title bar).
  const contentHeight = widget.size.height - TITLE_BAR_HEIGHT;

  // ---- Render ------------------------------------------------------------ //

  return (
    <div
      role="region"
      aria-label={`${typeLabel} widget`}
      onPointerDown={handleWidgetPointerDown}
      style={{
        position: "absolute",
        left: widget.position.x,
        top: widget.position.y,
        width: widget.size.width,
        /*
         * When minimized the widget collapses to title-bar height only.
         * The explicit pixel value avoids a layout-shift jump that a CSS
         * transition on `height: auto` would produce.
         */
        height: widget.minimized ? TITLE_BAR_HEIGHT : widget.size.height,
        zIndex: widget.zIndex,
      }}
      className="rounded-xl border bg-background/95 shadow-lg backdrop-blur-sm"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Title bar — drag handle                                             */}
      {/* ------------------------------------------------------------------ */}
      <div
        onPointerDown={handleTitlePointerDown}
        onPointerMove={handleTitlePointerMove}
        onPointerUp={handleTitlePointerUp}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        className="flex h-10 items-center justify-between border-b bg-muted/30 px-3 py-2"
      >
        {/* Left: grip affordance + type label */}
        <div className="flex min-w-0 items-center gap-1.5">
          <GripVertical
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted-foreground/50"
          />
          <span className="truncate text-xs font-medium text-foreground/80">
            {typeLabel}
          </span>
        </div>

        {/* Right: control buttons — pointer-down must not initiate a drag */}
        <div
          className="flex shrink-0 items-center gap-0.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={widget.minimized ? "Restore widget" : "Minimize widget"}
            onClick={handleMinimize}
          >
            {widget.minimized ? (
              <Maximize2 aria-hidden="true" />
            ) : (
              <Minus aria-hidden="true" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Close widget"
            onClick={handleClose}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Content area — hidden when minimized                               */}
      {/* ------------------------------------------------------------------ */}
      {!widget.minimized && (
        <div className="overflow-auto" style={{ height: contentHeight }}>
          <WidgetRenderer widget={widget} />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Resize handle — bottom-right corner, hidden when minimized         */}
      {/* ------------------------------------------------------------------ */}
      {!widget.minimized && (
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          className="absolute bottom-0 right-0"
        >
          <ResizeHandle onPointerDown={handleResizePointerDown} />
        </div>
      )}
    </div>
  );
}
