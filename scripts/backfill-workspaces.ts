/**
 * Backfill script: For each org → create "General" workspace (is_default=true)
 * → assign all projects → copy all org members as workspace members.
 *
 * Usage: npx tsx scripts/backfill-workspaces.ts
 */

import { db } from "@/lib/db";
import {
  organizations,
  organizationMembers,
  projects,
  workspaces,
  workspaceMembers,
} from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";

async function backfill() {
  console.log("Starting workspace backfill...");

  const orgs = await db.select().from(organizations);
  console.log(`Found ${orgs.length} organizations`);

  for (const org of orgs) {
    // Check if org already has a default workspace
    const existing = await db.query.workspaces.findFirst({
      where: (ws, { and, eq: e }) =>
        and(e(ws.orgId, org.id), e(ws.isDefault, true)),
    });

    if (existing) {
      console.log(`  Org "${org.name}" already has default workspace, skipping`);
      continue;
    }

    console.log(`  Creating default workspace for org "${org.name}"...`);

    // Create default workspace
    const [workspace] = await db
      .insert(workspaces)
      .values({
        orgId: org.id,
        name: "General",
        slug: "general",
        description: "Default workspace for all projects",
        isDefault: true,
        createdBy: "system",
      })
      .returning();

    // Copy all org members as workspace members
    const members = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.orgId, org.id));

    if (members.length > 0) {
      await db.insert(workspaceMembers).values(
        members.map((m) => ({
          workspaceId: workspace.id,
          userId: m.userId,
          role: m.role === "owner" ? "owner" : m.role === "admin" ? "admin" : "member",
        }))
      );
      console.log(`    Added ${members.length} members to workspace`);
    }

    // Assign all projects without a workspace to this default workspace
    const updated = await db
      .update(projects)
      .set({ workspaceId: workspace.id })
      .where(
        eq(projects.orgId, org.id)
      )
      .returning();

    console.log(`    Assigned ${updated.length} projects to workspace`);
  }

  console.log("Backfill complete!");
  process.exit(0);
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
