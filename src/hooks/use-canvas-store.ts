"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CanvasWidget, Viewport } from "@/lib/canvas/widget-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Initial viewport — centred at the canvas origin at 100 % zoom. */
const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

/**
 * Each new widget spawns this many logical pixels to the right of and below
 * the previous widget so stacked panels do not fully obscure one another.
 */
const CASCADE_STEP = 40;

/**
 * When the cascade offset on either axis would exceed this threshold the
 * counter resets to zero, keeping widgets within a comfortable screen region.
 */
const CASCADE_RESET_THRESHOLD = 400;

// ---------------------------------------------------------------------------
// State / action interface
// ---------------------------------------------------------------------------

interface CanvasState {
  /** All widgets currently on the canvas. */
  widgets: CanvasWidget[];

  /** Current pan/zoom transform of the canvas viewport. */
  viewport: Viewport;

  /**
   * Monotonically increasing counter used to assign z-index values.
   * Starts at 1 so the first widget gets zIndex 1.
   */
  nextZIndex: number;

  /** Whether the left sidebar (navigation / project list) is open. */
  sidebarOpen: boolean;

  /** Whether the PA chat panel is expanded to its full height. */
  chatExpanded: boolean;

  /**
   * Tracks where the most-recently spawned widget was placed so that the
   * next widget can cascade from that point.
   */
  lastSpawnPosition: { x: number; y: number };

  // -------------------------------------------------------------------------
  // Widget actions
  // -------------------------------------------------------------------------

  /**
   * Add a widget to the canvas.
   *
   * The caller supplies everything except `id` (auto-generated via
   * `crypto.randomUUID()`) and `zIndex` (auto-assigned from `nextZIndex`).
   * The widget's `position` is overridden by the store's cascade logic to
   * guarantee legible, non-fully-overlapping placement.
   */
  addWidget: (widget: Omit<CanvasWidget, "id" | "zIndex">) => void;

  /** Remove a widget by id. No-ops silently if the id is unknown. */
  removeWidget: (id: string) => void;

  /** Move a widget to an arbitrary canvas-coordinate position. */
  updateWidgetPosition: (id: string, position: { x: number; y: number }) => void;

  /** Resize a widget. */
  updateWidgetSize: (id: string, size: { width: number; height: number }) => void;

  /**
   * Bring a widget to the very front of the stacking order by assigning it
   * the current `nextZIndex` value and incrementing the counter.
   */
  bringToFront: (id: string) => void;

  /** Collapse a widget to its title bar. */
  minimizeWidget: (id: string) => void;

  /** Expand a previously minimised widget back to its full size. */
  restoreWidget: (id: string) => void;

  /** Remove every widget from the canvas. Viewport and UI state are preserved. */
  clearWidgets: () => void;

  // -------------------------------------------------------------------------
  // UI toggle actions
  // -------------------------------------------------------------------------

  toggleSidebar: () => void;
  toggleChat: () => void;

  // -------------------------------------------------------------------------
  // Viewport actions
  // -------------------------------------------------------------------------

  /** Translate the viewport by (dx, dy) in logical pixels. */
  panViewport: (dx: number, dy: number) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set) => ({
      // ----- initial state --------------------------------------------------
      widgets: [],
      viewport: DEFAULT_VIEWPORT,
      nextZIndex: 1,
      sidebarOpen: false,
      chatExpanded: false,
      lastSpawnPosition: { x: 0, y: 0 },

      // ----- widget actions -------------------------------------------------

      addWidget: (widget) =>
        set((state) => {
          const prevX = state.lastSpawnPosition.x;
          const prevY = state.lastSpawnPosition.y;

          const rawX = prevX + CASCADE_STEP;
          const rawY = prevY + CASCADE_STEP;

          // Reset cascade when an axis exceeds the threshold so new widgets
          // do not drift out of the visible viewport region.
          const spawnX = rawX > CASCADE_RESET_THRESHOLD ? 0 : rawX;
          const spawnY = rawY > CASCADE_RESET_THRESHOLD ? 0 : rawY;

          const newWidget: CanvasWidget = {
            ...widget,
            id: crypto.randomUUID(),
            position: { x: spawnX, y: spawnY },
            zIndex: state.nextZIndex,
          };

          return {
            widgets: [...state.widgets, newWidget],
            nextZIndex: state.nextZIndex + 1,
            lastSpawnPosition: { x: spawnX, y: spawnY },
          };
        }),

      removeWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.filter((w) => w.id !== id),
        })),

      updateWidgetPosition: (id, position) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, position } : w
          ),
        })),

      updateWidgetSize: (id, size) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, size } : w
          ),
        })),

      bringToFront: (id) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, zIndex: state.nextZIndex } : w
          ),
          nextZIndex: state.nextZIndex + 1,
        })),

      minimizeWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, minimized: true } : w
          ),
        })),

      restoreWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, minimized: false } : w
          ),
        })),

      clearWidgets: () => set({ widgets: [] }),

      // ----- UI toggle actions ----------------------------------------------

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      toggleChat: () =>
        set((state) => ({ chatExpanded: !state.chatExpanded })),

      // ----- viewport actions -----------------------------------------------

      panViewport: (dx, dy) =>
        set((state) => ({
          viewport: {
            ...state.viewport,
            x: state.viewport.x + dx,
            y: state.viewport.y + dy,
          },
        })),
    }),
    {
      name: "hive-canvas",
    }
  )
);
