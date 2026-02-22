"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getComponentsForPathway } from "@/lib/dashboard/component-registry";
import type { Pathway, DashboardComponentType } from "@/types/bees";
import {
  LayoutDashboard,
  List,
  Calendar,
  Activity,
  BarChart3,
  Users,
  FileText,
  MessageSquare,
  Bot,
  GanttChart,
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

interface SlotPickerProps {
  open: boolean;
  onClose: () => void;
  pathway: Pathway;
  currentType?: DashboardComponentType;
  onSelect: (type: DashboardComponentType) => void;
}

export function SlotPicker({
  open,
  onClose,
  pathway,
  currentType,
  onSelect,
}: SlotPickerProps) {
  const components = getComponentsForPathway(pathway);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a component</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
          {components.map((comp) => {
            const Icon = COMPONENT_ICONS[comp.type] ?? Puzzle;
            const isCurrent = comp.type === currentType;

            return (
              <Button
                key={comp.type}
                variant={isCurrent ? "default" : "outline"}
                className="h-auto justify-start gap-3 px-4 py-3 text-left"
                onClick={() => {
                  onSelect(comp.type);
                  onClose();
                }}
              >
                <Icon className="size-5 shrink-0" />
                <div>
                  <div className="font-medium">{comp.name}</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    {comp.description}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
