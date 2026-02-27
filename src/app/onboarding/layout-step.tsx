"use client";

import { useState } from "react";
import { LayoutCycler } from "@/components/dashboard/layout-cycler";
import { getPreset } from "@/lib/dashboard/presets";
import type { Pathway, SlotConfig } from "@/types/bees";
import {
  LayoutDashboard,
  List,
  GanttChart,
  Calendar,
  Activity,
  BarChart3,
  Users,
  FileText,
  MessageSquare,
  Bot,
  Puzzle,
} from "lucide-react";

const COMPONENT_ICONS: Record<string, React.ElementType> = {
  board: LayoutDashboard,
  list: List,
  timeline: GanttChart,
  calendar: Calendar,
  activity_feed: Activity,
  metrics_panel: BarChart3,
  team_view: Users,
  files: FileText,
  chat_messages: MessageSquare,
  bee_panel: Bot,
  custom_widget: Puzzle,
};

const COMPONENT_NAMES: Record<string, string> = {
  board: "Board",
  list: "List",
  timeline: "Timeline",
  calendar: "Calendar",
  activity_feed: "Activity",
  metrics_panel: "Metrics",
  team_view: "Team",
  files: "Files",
  chat_messages: "Messages",
  bee_panel: "AI Assistant",
  custom_widget: "Widget",
};

interface LayoutStepProps {
  pathway: Pathway;
  presetIndex: number;
  onPresetChange: (index: number) => void;
}

export function LayoutStep({
  pathway,
  presetIndex,
  onPresetChange,
}: LayoutStepProps) {
  const preset = getPreset(pathway, presetIndex);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Pick a layout</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Cycle through preset layouts. You can customize individual slots later.
        </p>
      </div>

      <div className="flex justify-center">
        <LayoutCycler
          pathway={pathway}
          currentIndex={presetIndex}
          onIndexChange={onPresetChange}
        />
      </div>

      {/* Layout preview */}
      <div className="rounded-lg border border-border bg-muted/30 p-2 sm:p-4 overflow-x-auto">
        <p className="text-sm font-medium mb-3 text-center">{preset.name}</p>
        <div
          className="grid min-w-[320px] grid-cols-4 gap-1.5 sm:gap-2"
          style={{
            gridTemplateRows: `repeat(4, 60px)`,
          }}
        >
          {preset.slots.map((slot) => {
            const Icon = COMPONENT_ICONS[slot.componentType] ?? Puzzle;
            const name = COMPONENT_NAMES[slot.componentType] ?? slot.componentType;

            return (
              <div
                key={slot.slotId}
                className="flex flex-col items-center justify-center rounded-md border border-border bg-card text-center"
                style={{
                  gridColumn: `${slot.x + 1} / span ${slot.width}`,
                  gridRow: `${slot.y + 1} / span ${slot.height}`,
                }}
              >
                <Icon className="size-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">
                  {name}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {preset.description}
        </p>
      </div>
    </div>
  );
}
