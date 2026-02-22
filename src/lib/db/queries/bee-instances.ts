import { db } from "@/lib/db";
import { beeInstances, beeTemplates } from "@/lib/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";

export async function createBeeInstance(data: {
  templateId: string;
  orgId: string;
  projectId?: string;
  name: string;
  contextOverrides?: Record<string, unknown>;
}) {
  const [instance] = await db
    .insert(beeInstances)
    .values({
      templateId: data.templateId,
      orgId: data.orgId,
      projectId: data.projectId,
      name: data.name,
      contextOverrides: data.contextOverrides ?? {},
    })
    .returning();

  return instance;
}

export async function getBeeInstances(
  orgId: string,
  projectId?: string
) {
  if (projectId) {
    return db
      .select({
        instance: beeInstances,
        template: beeTemplates,
      })
      .from(beeInstances)
      .innerJoin(beeTemplates, eq(beeInstances.templateId, beeTemplates.id))
      .where(
        and(
          eq(beeInstances.orgId, orgId),
          eq(beeInstances.isActive, true),
          eq(beeInstances.projectId, projectId)
        )
      )
      .orderBy(desc(beeInstances.createdAt));
  }

  // Org-wide instances (no projectId)
  return db
    .select({
      instance: beeInstances,
      template: beeTemplates,
    })
    .from(beeInstances)
    .innerJoin(beeTemplates, eq(beeInstances.templateId, beeTemplates.id))
    .where(
      and(
        eq(beeInstances.orgId, orgId),
        eq(beeInstances.isActive, true)
      )
    )
    .orderBy(desc(beeInstances.createdAt));
}

export async function getActiveBeeInstancesForSwarm(
  orgId: string,
  projectId?: string
) {
  // Get all active instances: org-wide + project-specific
  const orgWide = await db
    .select({
      instance: beeInstances,
      template: beeTemplates,
    })
    .from(beeInstances)
    .innerJoin(beeTemplates, eq(beeInstances.templateId, beeTemplates.id))
    .where(
      and(
        eq(beeInstances.orgId, orgId),
        eq(beeInstances.isActive, true),
        eq(beeTemplates.isActive, true),
        isNull(beeInstances.projectId)
      )
    );

  if (!projectId) return orgWide;

  const projectSpecific = await db
    .select({
      instance: beeInstances,
      template: beeTemplates,
    })
    .from(beeInstances)
    .innerJoin(beeTemplates, eq(beeInstances.templateId, beeTemplates.id))
    .where(
      and(
        eq(beeInstances.orgId, orgId),
        eq(beeInstances.isActive, true),
        eq(beeTemplates.isActive, true),
        eq(beeInstances.projectId, projectId)
      )
    );

  return [...orgWide, ...projectSpecific];
}

export async function getBeeInstance(instanceId: string) {
  const results = await db
    .select({
      instance: beeInstances,
      template: beeTemplates,
    })
    .from(beeInstances)
    .innerJoin(beeTemplates, eq(beeInstances.templateId, beeTemplates.id))
    .where(eq(beeInstances.id, instanceId))
    .limit(1);

  return results[0] ?? null;
}

export async function updateBeeInstance(
  instanceId: string,
  updates: Partial<{
    name: string;
    contextOverrides: Record<string, unknown>;
    isActive: boolean;
  }>
) {
  const [updated] = await db
    .update(beeInstances)
    .set({ ...updates, updatedAt: new Date() } as any)
    .where(eq(beeInstances.id, instanceId))
    .returning();

  return updated;
}

export async function deleteBeeInstance(instanceId: string) {
  const [deleted] = await db
    .delete(beeInstances)
    .where(eq(beeInstances.id, instanceId))
    .returning();

  return deleted;
}
