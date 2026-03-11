/**
 * Seed script: Creates the system PM Agent bee template.
 * This template is used to auto-provision PM agent instances for each workspace.
 *
 * Usage: npx tsx scripts/seed-pm-agent.ts
 */

import { db } from "@/lib/db";
import { beeTemplates, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const PM_AGENT_SYSTEM_PROMPT = `You are an autonomous Project Management Agent for Hive.

Your responsibilities:
1. Monitor project and task progress across the workspace
2. Generate daily standup summaries highlighting completed tasks, in-progress work, and blockers
3. Produce weekly reports with velocity metrics, completion rates, and team contributions
4. Track deadlines and proactively flag tasks at risk of slipping
5. Escalate blockers to project leads when check-ins indicate problems

Communication style:
- Be concise and data-driven
- Lead with the most important information
- Use bullet points for clarity
- Highlight blockers and risks prominently
- Include specific task and project names
- End standups with a brief outlook for the day

When generating reports:
- Include quantitative metrics (tasks completed, velocity, completion %)
- Break down by project when the workspace has multiple projects
- Compare current period to previous for trends
- Call out team members who made significant contributions
- Flag upcoming deadlines within the next 7 days`;

const PM_AGENT_TOOL_ACCESS = [
  "check_tasks",
  "check_project_status",
  "check_workload",
  "generate_report",
  "create_comment",
  "flag_blocker",
  "post_channel_message",
];

async function seed() {
  console.log("Seeding PM Agent template...");

  // Get all orgs — create one template per org
  const orgs = await db.select({ id: organizations.id, name: organizations.name }).from(organizations);

  for (const org of orgs) {
    // Check if already exists
    const existing = await db.query.beeTemplates.findFirst({
      where: (t, { and, eq: e }) =>
        and(
          e(t.orgId, org.id),
          e(t.name, "PM Agent"),
          e(t.isSystem, true)
        ),
    });

    if (existing) {
      console.log(`  PM Agent template already exists for org "${org.name}", skipping`);
      continue;
    }

    const [template] = await db
      .insert(beeTemplates)
      .values({
        orgId: org.id,
        name: "PM Agent",
        type: "manager",
        subtype: "coordinator",
        systemPrompt: PM_AGENT_SYSTEM_PROMPT,
        toolAccess: PM_AGENT_TOOL_ACCESS,
        defaultAutonomyTier: "auto_execute",
        triggerConditions: { type: "scheduled" },
        isSystem: true,
        isActive: true,
      })
      .returning();

    console.log(`  Created PM Agent template (${template.id}) for org "${org.name}"`);
  }

  console.log("PM Agent seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
