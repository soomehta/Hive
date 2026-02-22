import type { DashboardComponentType, Pathway } from "@/types/bees";

export interface ComponentDefinition {
  type: DashboardComponentType;
  name: string;
  description: string;
  supportedPathways: Pathway[];
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  defaultConfig: Record<string, unknown>;
}

export const COMPONENT_DEFINITIONS: ComponentDefinition[] = [
  {
    type: "board",
    name: "Board",
    description: "Kanban board with draggable task cards organized by status columns",
    supportedPathways: ["boards", "lists", "workspace"],
    minWidth: 2,
    maxWidth: 4,
    minHeight: 2,
    maxHeight: 4,
    defaultConfig: {},
  },
  {
    type: "list",
    name: "List",
    description: "Task table with sort and filter capabilities",
    supportedPathways: ["lists", "workspace"],
    minWidth: 2,
    maxWidth: 4,
    minHeight: 2,
    maxHeight: 4,
    defaultConfig: {},
  },
  {
    type: "timeline",
    name: "Timeline",
    description: "Gantt-style date view of tasks with due dates",
    supportedPathways: ["lists", "workspace"],
    minWidth: 2,
    maxWidth: 4,
    minHeight: 1,
    maxHeight: 3,
    defaultConfig: {},
  },
  {
    type: "calendar",
    name: "Calendar",
    description: "Calendar view showing tasks by due date",
    supportedPathways: ["boards", "lists", "workspace"],
    minWidth: 1,
    maxWidth: 4,
    minHeight: 2,
    maxHeight: 4,
    defaultConfig: {},
  },
  {
    type: "activity_feed",
    name: "Activity Feed",
    description: "Recent activity across the project",
    supportedPathways: ["boards", "lists", "workspace"],
    minWidth: 1,
    maxWidth: 2,
    minHeight: 1,
    maxHeight: 4,
    defaultConfig: {},
  },
  {
    type: "metrics_panel",
    name: "Metrics",
    description: "Progress bars, completion percentage, and overdue count",
    supportedPathways: ["boards", "lists", "workspace"],
    minWidth: 2,
    maxWidth: 4,
    minHeight: 1,
    maxHeight: 2,
    defaultConfig: {},
  },
  {
    type: "team_view",
    name: "Team",
    description: "Who is working on what — team member task breakdown",
    supportedPathways: ["boards", "lists", "workspace"],
    minWidth: 1,
    maxWidth: 2,
    minHeight: 1,
    maxHeight: 4,
    defaultConfig: {},
  },
  {
    type: "files",
    name: "Files",
    description: "Shared documents and attachments",
    supportedPathways: ["workspace"],
    minWidth: 1,
    maxWidth: 4,
    minHeight: 1,
    maxHeight: 3,
    defaultConfig: {},
  },
  {
    type: "chat_messages",
    name: "Messages",
    description: "Project chat and discussion messages",
    supportedPathways: ["workspace"],
    minWidth: 1,
    maxWidth: 4,
    minHeight: 2,
    maxHeight: 4,
    defaultConfig: {},
  },
  {
    type: "bee_panel",
    name: "Bee Panel",
    description: "Embedded AI assistant bee panel",
    supportedPathways: ["boards", "lists", "workspace"],
    minWidth: 1,
    maxWidth: 2,
    minHeight: 2,
    maxHeight: 4,
    defaultConfig: {},
  },
];

export function getComponentsForPathway(
  pathway: Pathway
): ComponentDefinition[] {
  return COMPONENT_DEFINITIONS.filter((c) =>
    c.supportedPathways.includes(pathway)
  );
}

export function getComponentDefinition(
  type: DashboardComponentType
): ComponentDefinition | undefined {
  return COMPONENT_DEFINITIONS.find((c) => c.type === type);
}
