"use client";

import { useState, useMemo, lazy, Suspense } from "react";
import { useOrg } from "@/hooks/use-org";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { SlotContainer } from "./slot-container";
import { SlotPicker } from "./slot-picker";
import { LayoutCycler } from "./layout-cycler";
import { getPreset } from "@/lib/dashboard/presets";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings2, Check } from "lucide-react";
import type { Pathway, SlotConfig, DashboardComponentType, WidgetProps } from "@/types/bees";

// Lazy-loaded widget components
const BoardWidget = lazy(() => import("./component-wrappers/board-widget").then((m) => ({ default: m.BoardWidget })));
const ListWidget = lazy(() => import("./component-wrappers/list-widget").then((m) => ({ default: m.ListWidget })));
const TimelineWidget = lazy(() => import("./component-wrappers/timeline-widget").then((m) => ({ default: m.TimelineWidget })));
const CalendarWidget = lazy(() => import("./component-wrappers/calendar-widget").then((m) => ({ default: m.CalendarWidget })));
const ActivityWidget = lazy(() => import("./component-wrappers/activity-widget").then((m) => ({ default: m.ActivityWidget })));
const MetricsWidget = lazy(() => import("./component-wrappers/metrics-widget").then((m) => ({ default: m.MetricsWidget })));
const TeamWidget = lazy(() => import("./component-wrappers/team-widget").then((m) => ({ default: m.TeamWidget })));
const FilesWidget = lazy(() => import("./component-wrappers/files-widget").then((m) => ({ default: m.FilesWidget })));
const ChatWidget = lazy(() => import("./component-wrappers/chat-widget").then((m) => ({ default: m.ChatWidget })));
const BeePanelWidget = lazy(() => import("./component-wrappers/bee-panel-widget").then((m) => ({ default: m.BeePanelWidget })));

const WIDGET_MAP: Record<DashboardComponentType, React.LazyExoticComponent<React.ComponentType<WidgetProps>>> = {
  board: BoardWidget,
  list: ListWidget,
  timeline: TimelineWidget,
  calendar: CalendarWidget,
  activity_feed: ActivityWidget,
  metrics_panel: MetricsWidget,
  team_view: TeamWidget,
  files: FilesWidget,
  chat_messages: ChatWidget,
  bee_panel: BeePanelWidget,
  custom_widget: FilesWidget, // fallback
};

interface DashboardEngineProps {
  pathway: Pathway;
  projectId?: string;
}

export function DashboardEngine({ pathway, projectId }: DashboardEngineProps) {
  const { orgId } = useOrg();
  const { layout, isLoading, saveLayout, isSaving } = useDashboardLayout(projectId);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [localPresetIndex, setLocalPresetIndex] = useState<number | null>(null);
  const [localSlots, setLocalSlots] = useState<SlotConfig[] | null>(null);

  const presetIndex = localPresetIndex ?? layout?.layoutPresetIndex ?? 0;
  const slots = localSlots ?? layout?.slots ?? getPreset(pathway, presetIndex).slots;

  const maxRow = useMemo(() => {
    let max = 0;
    for (const s of slots) {
      max = Math.max(max, s.y + s.height);
    }
    return max;
  }, [slots]);

  function handlePresetChange(index: number) {
    setLocalPresetIndex(index);
    setLocalSlots(getPreset(pathway, index).slots);
  }

  function handleSlotComponentChange(slotId: string, newType: DashboardComponentType) {
    const updated = slots.map((s) =>
      s.slotId === slotId ? { ...s, componentType: newType } : s
    );
    setLocalSlots(updated);
  }

  function handleSave() {
    saveLayout({
      pathway,
      layoutPresetIndex: presetIndex,
      slots: localSlots ?? slots,
      projectId,
    });
    setIsEditing(false);
    setLocalSlots(null);
    setLocalPresetIndex(null);
  }

  if (!orgId) return null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4 h-[600px]">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="col-span-2 row-span-2" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {isEditing && (
          <LayoutCycler
            pathway={pathway}
            currentIndex={presetIndex}
            onIndexChange={handlePresetChange}
          />
        )}
        {!isEditing && <div />}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Check className="size-4 mr-1" />
              {isSaving ? "Saving..." : "Done"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Settings2 className="size-4 mr-1" />
              Customize
            </Button>
          )}
        </div>
      </div>

      {/* Grid Layout */}
      <div
        className="grid grid-cols-4 gap-4"
        style={{
          gridTemplateRows: `repeat(${maxRow}, minmax(150px, 1fr))`,
        }}
      >
        {slots.map((slot) => {
          const Widget = WIDGET_MAP[slot.componentType];
          const widgetProps: WidgetProps = {
            orgId,
            projectId,
            config: slot.config,
            width: slot.width,
            height: slot.height,
            isEditing,
          };

          return (
            <SlotContainer
              key={slot.slotId}
              slot={slot}
              isEditing={isEditing}
              onEdit={setEditingSlotId}
            >
              <Suspense
                fallback={<Skeleton className="h-full w-full" />}
              >
                <Widget {...widgetProps} />
              </Suspense>
            </SlotContainer>
          );
        })}
      </div>

      {/* Slot Picker Dialog */}
      <SlotPicker
        open={!!editingSlotId}
        onClose={() => setEditingSlotId(null)}
        pathway={pathway}
        currentType={
          editingSlotId
            ? slots.find((s) => s.slotId === editingSlotId)?.componentType
            : undefined
        }
        onSelect={(type) => {
          if (editingSlotId) {
            handleSlotComponentChange(editingSlotId, type);
          }
        }}
      />
    </div>
  );
}
