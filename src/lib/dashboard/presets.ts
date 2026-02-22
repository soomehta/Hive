import type { Pathway, SlotConfig, DashboardComponentType } from "@/types/bees";

export interface LayoutPreset {
  name: string;
  description: string;
  slots: SlotConfig[];
}

function slot(
  slotId: string,
  type: DashboardComponentType,
  x: number,
  y: number,
  width: number,
  height: number
): SlotConfig {
  return { slotId, componentType: type, config: {}, x, y, width, height };
}

const BOARDS_PRESETS: LayoutPreset[] = [
  {
    name: "Kanban Focus",
    description: "Full board with activity sidebar",
    slots: [
      slot("main", "board", 0, 0, 3, 4),
      slot("sidebar", "activity_feed", 3, 0, 1, 4),
    ],
  },
  {
    name: "Kanban + Metrics",
    description: "Metrics header with board below",
    slots: [
      slot("metrics", "metrics_panel", 0, 0, 4, 1),
      slot("main", "board", 0, 1, 4, 3),
    ],
  },
  {
    name: "Kanban + Team",
    description: "Board with team sidebar",
    slots: [
      slot("main", "board", 0, 0, 3, 4),
      slot("sidebar", "team_view", 3, 0, 1, 4),
    ],
  },
  {
    name: "Kanban + Calendar",
    description: "Board with calendar sidebar",
    slots: [
      slot("main", "board", 0, 0, 3, 4),
      slot("sidebar", "calendar", 3, 0, 1, 4),
    ],
  },
];

const LISTS_PRESETS: LayoutPreset[] = [
  {
    name: "List Focus",
    description: "Full task list with activity sidebar",
    slots: [
      slot("main", "list", 0, 0, 3, 4),
      slot("sidebar", "activity_feed", 3, 0, 1, 4),
    ],
  },
  {
    name: "List + Timeline",
    description: "Task list with timeline below",
    slots: [
      slot("list", "list", 0, 0, 4, 2),
      slot("timeline", "timeline", 0, 2, 4, 2),
    ],
  },
  {
    name: "List + Metrics",
    description: "Metrics header with task list",
    slots: [
      slot("metrics", "metrics_panel", 0, 0, 4, 1),
      slot("main", "list", 0, 1, 3, 3),
      slot("sidebar", "team_view", 3, 1, 1, 3),
    ],
  },
  {
    name: "List + Calendar",
    description: "Task list with calendar view",
    slots: [
      slot("list", "list", 0, 0, 2, 4),
      slot("calendar", "calendar", 2, 0, 2, 4),
    ],
  },
];

const WORKSPACE_PRESETS: LayoutPreset[] = [
  {
    name: "Command Center",
    description: "Full overview with all key widgets",
    slots: [
      slot("metrics", "metrics_panel", 0, 0, 4, 1),
      slot("board", "board", 0, 1, 2, 3),
      slot("timeline", "timeline", 2, 1, 2, 1),
      slot("activity", "activity_feed", 2, 2, 1, 2),
      slot("team", "team_view", 3, 2, 1, 2),
    ],
  },
  {
    name: "Project Hub",
    description: "Board, chat, and files together",
    slots: [
      slot("board", "board", 0, 0, 2, 4),
      slot("chat", "chat_messages", 2, 0, 2, 2),
      slot("files", "files", 2, 2, 2, 2),
    ],
  },
  {
    name: "Timeline Focus",
    description: "Timeline with supporting widgets",
    slots: [
      slot("metrics", "metrics_panel", 0, 0, 4, 1),
      slot("timeline", "timeline", 0, 1, 4, 2),
      slot("activity", "activity_feed", 0, 3, 2, 1),
      slot("team", "team_view", 2, 3, 2, 1),
    ],
  },
  {
    name: "Team Dashboard",
    description: "People-centric view",
    slots: [
      slot("team", "team_view", 0, 0, 2, 2),
      slot("metrics", "metrics_panel", 2, 0, 2, 1),
      slot("activity", "activity_feed", 2, 1, 2, 1),
      slot("list", "list", 0, 2, 4, 2),
    ],
  },
];

export const PRESETS: Record<Pathway, LayoutPreset[]> = {
  boards: BOARDS_PRESETS,
  lists: LISTS_PRESETS,
  workspace: WORKSPACE_PRESETS,
};

export function getPresets(pathway: Pathway): LayoutPreset[] {
  return PRESETS[pathway];
}

export function getPreset(pathway: Pathway, index: number): LayoutPreset {
  const presets = PRESETS[pathway];
  return presets[Math.max(0, Math.min(index, presets.length - 1))];
}

export function getPresetCount(pathway: Pathway): number {
  return PRESETS[pathway].length;
}
