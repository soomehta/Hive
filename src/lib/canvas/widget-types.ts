/**
 * Canvas widget type definitions for the canvas-centric dashboard.
 *
 * Widgets are free-floating, resizable panels that live on an infinite
 * panning/zooming canvas. Each widget carries its own layout geometry
 * (position, size, z-index) and an opaque `data` bag whose shape is
 * determined by the consuming component for that `WidgetType`.
 */

export type WidgetType =
  | "project-card"
  | "task-list"
  | "task-detail"
  | "report"
  | "briefing"
  | "calendar"
  | "generic";

export interface CanvasWidget {
  /** Stable UUID assigned at creation time. */
  id: string;

  /** Discriminator that controls which component renders inside the widget. */
  type: WidgetType;

  /** Top-left corner position in canvas (logical) coordinates. */
  position: {
    x: number;
    y: number;
  };

  /** Widget dimensions in logical pixels. */
  size: {
    width: number;
    height: number;
  };

  /**
   * Stacking order. Higher values render on top of lower ones.
   * Managed exclusively by the canvas store — never mutate directly.
   */
  zIndex: number;

  /** When true the widget is collapsed to its title bar only. */
  minimized: boolean;

  /**
   * Arbitrary payload consumed by the widget's renderer.
   * Typed as `Record<string, unknown>` rather than `any` so that
   * consumer code must narrow before use, preventing silent unsafe access.
   */
  data: Record<string, unknown>;

  /**
   * Optional reference to the PA chat message that spawned this widget,
   * enabling back-navigation from a canvas panel to its conversation thread.
   */
  sourceMessageId?: string;
}

/** Describes the current pan/zoom transform applied to the canvas viewport. */
export interface Viewport {
  /** Horizontal pan offset in logical pixels. */
  x: number;

  /** Vertical pan offset in logical pixels. */
  y: number;

  /**
   * Zoom level where 1 = 100 %. Typical range: 0.25 – 2.
   * Applied as `scale(zoom)` in the canvas CSS transform.
   */
  zoom: number;
}
