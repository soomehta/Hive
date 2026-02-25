import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

const SYSTEM_BEE_TEMPLATES = [
  {
    name: "Assistant Bee",
    type: "assistant" as const,
    subtype: "none" as const,
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
    defaultAutonomyTier: "draft_approve" as const,
    triggerConditions: {},
  },
  {
    name: "Admin Bee",
    type: "admin" as const,
    subtype: "none" as const,
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
    defaultAutonomyTier: "draft_approve" as const,
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

const COMPONENT_DEFINITIONS = [
  {
    type: "board" as const,
    name: "Board",
    description:
      "Kanban board with draggable task cards organized by status columns",
    supportedPathways: ["boards", "lists", "workspace"],
    minWidth: 2,
    maxWidth: 4,
    minHeight: 2,
    maxHeight: 4,
    defaultConfig: {},
  },
  {
    type: "list" as const,
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
    type: "timeline" as const,
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
    type: "calendar" as const,
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
    type: "activity_feed" as const,
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
    type: "metrics_panel" as const,
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
    type: "team_view" as const,
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
    type: "files" as const,
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
    type: "chat_messages" as const,
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
    type: "bee_panel" as const,
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

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set");
  }

  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });

  console.log("Seeding database...\n");

  // 1. Seed component registry
  console.log("--- Component Registry ---");
  for (const comp of COMPONENT_DEFINITIONS) {
    const existing = await db
      .select({ id: schema.componentRegistry.id })
      .from(schema.componentRegistry)
      .where(eq(schema.componentRegistry.type, comp.type))
      .limit(1);

    if (existing.length > 0) {
      console.log(`~ ${comp.name} (already exists)`);
      continue;
    }

    await db.insert(schema.componentRegistry).values({
      type: comp.type,
      name: comp.name,
      description: comp.description,
      supportedPathways: comp.supportedPathways,
      minWidth: comp.minWidth,
      maxWidth: comp.maxWidth,
      minHeight: comp.minHeight,
      maxHeight: comp.maxHeight,
      defaultConfig: comp.defaultConfig,
    });
    console.log(`✓ ${comp.name}`);
  }

  // 2. Seed system bee templates for all existing organizations
  console.log("\n--- System Bee Templates ---");
  const orgs = await db
    .select({ id: schema.organizations.id, name: schema.organizations.name })
    .from(schema.organizations);

  if (orgs.length === 0) {
    console.log("No organizations found. System bees will be created during onboarding.");
  }

  for (const org of orgs) {
    console.log(`\nOrg: ${org.name} (${org.id})`);

    for (const bee of SYSTEM_BEE_TEMPLATES) {
      // Check if system template already exists for this org
      const existing = await db
        .select({ id: schema.beeTemplates.id })
        .from(schema.beeTemplates)
        .where(eq(schema.beeTemplates.orgId, org.id))
        .limit(1);

      const alreadyHasType = await db
        .select({ id: schema.beeTemplates.id })
        .from(schema.beeTemplates)
        .where(eq(schema.beeTemplates.orgId, org.id))
        .then((rows) => rows.some(() => false)); // just need to check

      // Use a more specific check
      const existingTemplate = await db
        .select({ id: schema.beeTemplates.id })
        .from(schema.beeTemplates)
        .where(eq(schema.beeTemplates.orgId, org.id))
        .then((rows) => {
          // We need to check by name since we can't easily chain .where in this context
          return rows;
        });

      // Simple approach: check by querying with unsafe filter
      const templateExists = (
        await db
          .select({ id: schema.beeTemplates.id, name: schema.beeTemplates.name })
          .from(schema.beeTemplates)
          .where(eq(schema.beeTemplates.orgId, org.id))
      ).some((t) => t.name === bee.name);

      if (templateExists) {
        console.log(`  ~ ${bee.name} (already exists)`);
        continue;
      }

      const [template] = await db
        .insert(schema.beeTemplates)
        .values({
          orgId: org.id,
          name: bee.name,
          type: bee.type,
          subtype: bee.subtype,
          systemPrompt: bee.systemPrompt,
          toolAccess: bee.toolAccess,
          defaultAutonomyTier: bee.defaultAutonomyTier,
          triggerConditions: bee.triggerConditions,
          isSystem: true,
          isActive: true,
        })
        .returning();

      console.log(`  ✓ ${bee.name} (${template.id})`);

      // Create org-wide instance for Assistant Bee
      if (bee.type === "assistant") {
        await db.insert(schema.beeInstances).values({
          templateId: template.id,
          orgId: org.id,
          name: bee.name,
          isActive: true,
        });
        console.log(`    ✓ Instance created (org-wide)`);
      }
    }
  }

  console.log("\nSeeding complete.");
  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
