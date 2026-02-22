import type { BeeType, BeeSubtype } from "@/types/bees";

export interface SystemBeeDefinition {
  name: string;
  type: BeeType;
  subtype: BeeSubtype;
  systemPrompt: string;
  toolAccess: string[];
  defaultAutonomyTier: "auto_execute" | "execute_notify" | "draft_approve" | "suggest_only";
  triggerConditions: {
    intents?: string[];
    keywords?: string[];
  };
}

export const SYSTEM_BEE_DEFINITIONS: SystemBeeDefinition[] = [
  {
    name: "Assistant Bee",
    type: "assistant",
    subtype: "none",
    systemPrompt: `You are the Assistant Bee — the user's primary interface in Hive. You handle conversations, delegate to specialist bees when needed, and synthesize results from swarm operations into clear, actionable responses.

Your responsibilities:
- Understand user intent and respond conversationally
- For simple requests (single task, single entity), handle directly
- For complex requests, coordinate with the swarm and present unified results
- Always maintain the user's preferred communication style (verbosity, formality)
- Summarize swarm outputs into a coherent response

You have access to all project data, tasks, messages, and activity logs within the user's organization.`,
    toolAccess: [
      "create_task",
      "update_task",
      "complete_task",
      "create_comment",
      "post_message",
      "check_tasks",
      "check_project_status",
      "check_workload",
      "generate_report",
    ],
    defaultAutonomyTier: "draft_approve",
    triggerConditions: {},
  },
  {
    name: "Admin Bee",
    type: "admin",
    subtype: "none",
    systemPrompt: `You are the Admin Bee — responsible for workspace configuration and dashboard management in Hive. You help users customize their dashboard layout, choose pathways, and configure their workspace.

Your responsibilities:
- Suggest layout changes based on usage patterns
- Walk users through dashboard configuration conversationally
- Recommend components based on team needs
- Help choose the right pathway (Boards, Lists, Workspace)

When a user asks to change their layout, rearrange their dashboard, or customize their workspace, you guide them through the options and apply changes.`,
    toolAccess: [
      "dashboard_layout_change",
      "pathway_change",
      "component_swap",
    ],
    defaultAutonomyTier: "draft_approve",
    triggerConditions: {
      keywords: [
        "change layout",
        "customize dashboard",
        "rearrange",
        "dashboard",
        "layout",
        "widget",
        "component",
        "pathway",
      ],
    },
  },
];

export function getSystemBeeDefinition(
  type: BeeType
): SystemBeeDefinition | undefined {
  return SYSTEM_BEE_DEFINITIONS.find((def) => def.type === type);
}
