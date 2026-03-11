"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useCanvasStore } from "@/hooks/use-canvas-store";
import { CanvasWidget } from "./canvas-widget";
import { CanvasPAChat } from "./canvas-pa-chat";
import { CanvasNotificationDots } from "./canvas-notification-dots";
import { MinimizedWidgetTray } from "./minimized-widget-tray";

// ---------------------------------------------------------------------------
// Dot-grid background
//
// The tile is 24 × 24 px (matches `background-size`). The background-position
// shifts 1:1 with the viewport pan offset — modulo one tile width/height —
// so the dots appear to be fixed to the infinite canvas coordinate space
// rather than to the screen.
// ---------------------------------------------------------------------------

const DOT_GRID_SIZE = 24; // px — must match the background-size value below

function buildGridStyle(vx: number, vy: number): React.CSSProperties {
  // Wrap offset inside a single tile so the value stays small even after
  // the user pans thousands of pixels, avoiding any floating-point drift.
  const bpx = ((vx % DOT_GRID_SIZE) + DOT_GRID_SIZE) % DOT_GRID_SIZE;
  const bpy = ((vy % DOT_GRID_SIZE) + DOT_GRID_SIZE) % DOT_GRID_SIZE;

  return {
    backgroundImage:
      "radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)",
    backgroundSize: `${DOT_GRID_SIZE}px ${DOT_GRID_SIZE}px`,
    backgroundPosition: `${bpx}px ${bpy}px`,
  };
}

// ---------------------------------------------------------------------------
// CanvasRoot
// ---------------------------------------------------------------------------

export function CanvasRoot({ children }: { children?: React.ReactNode }) {
  const viewport = useCanvasStore((s) => s.viewport);
  const panViewport = useCanvasStore((s) => s.panViewport);
  const widgets = useCanvasStore((s) => s.widgets);

  // -------------------------------------------------------------------------
  // Panning state
  //
  // `isPanning` drives the cursor class (needs React state for re-render).
  // `isPanningRef` is the mutable flag checked inside pointer-event handlers
  // to avoid stale-closure issues.
  // -------------------------------------------------------------------------
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);

  // -------------------------------------------------------------------------
  // Space-key state
  //
  // Same dual ref+state pattern: the ref is cheap to check in event handlers;
  // the state value drives the cursor class re-render.
  // -------------------------------------------------------------------------
  const isSpaceDownRef = useRef(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);

  // -------------------------------------------------------------------------
  // Keyboard listeners — Space key activates "pan mode" for left-click drag
  // -------------------------------------------------------------------------

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Do not intercept Space when the user is typing in a form control or
      // a content-editable element.
      const target = e.target as HTMLElement | null;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (e.code === "Space" && !isEditable && !e.repeat) {
        e.preventDefault();
        isSpaceDownRef.current = true;
        setIsSpaceDown(true);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        isSpaceDownRef.current = false;
        setIsSpaceDown(false);

        // If the user releases Space while mid-pan, end the pan cleanly.
        if (isPanningRef.current) {
          isPanningRef.current = false;
          setIsPanning(false);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Pointer handlers
  // -------------------------------------------------------------------------

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const isMiddleClick = e.button === 1;
      const isSpaceDrag = e.button === 0 && isSpaceDownRef.current;

      if (!isMiddleClick && !isSpaceDrag) return;

      // Prevent the browser's native autoscroll behaviour triggered by a
      // middle-button press.
      e.preventDefault();

      // Capture the pointer so pointermove/pointerup continue to fire even
      // when the cursor moves outside the element boundaries.
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

      isPanningRef.current = true;
      setIsPanning(true);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPanningRef.current) return;
      panViewport(e.movementX, e.movementY);
    },
    [panViewport]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPanningRef.current) return;
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      isPanningRef.current = false;
      setIsPanning(false);
    },
    []
  );

  // Suppress the context menu that some browsers show on middle-click release.
  const handleAuxClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1) e.preventDefault();
  }, []);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const cursorClass = isPanning
    ? "cursor-grabbing"
    : isSpaceDown
    ? "cursor-grab"
    : "cursor-default";

  const activeWidgets = widgets.filter((w) => !w.minimized);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-background select-none ${cursorClass}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onAuxClick={handleAuxClick}
      // Prevent the browser from triggering native drag on the canvas element.
      onDragStart={(e) => e.preventDefault()}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Dot-grid background layer                                           */}
      {/* Shifts with the viewport pan so dots are "fixed" to canvas space.  */}
      {/* pointer-events: none ensures it never captures clicks.             */}
      {/* ------------------------------------------------------------------ */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={buildGridStyle(viewport.x, viewport.y)}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Transformed canvas layer                                            */}
      {/* All non-minimised widgets live here, translated by the pan offset. */}
      {/* will-change: transform hints to the browser to promote this layer  */}
      {/* to its own compositing layer for smoother panning.                 */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px)`,
        }}
      >
        {activeWidgets.map((widget) => (
          <CanvasWidget key={widget.id} widget={widget} />
        ))}

        {/* Optional declaratively composed children (Storybook, tests, etc.) */}
        {children}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Fixed UI layer — these elements are NOT inside the transformed div  */}
      {/* and therefore do not move when the user pans.                       */}
      {/* ------------------------------------------------------------------ */}
      <CanvasNotificationDots />
      <CanvasPAChat />
      <MinimizedWidgetTray />
    </div>
  );
}
