import { db } from "@/lib/db";
import { beeTemplates } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function createBeeTemplate(data: {
  orgId: string;
  name: string;
  type: string;
  subtype?: string;
  systemPrompt: string;
  toolAccess?: unknown[];
  defaultAutonomyTier?: string;
  triggerConditions?: Record<string, unknown>;
  isSystem?: boolean;
}) {
  const [template] = await db
    .insert(beeTemplates)
    .values({
      orgId: data.orgId,
      name: data.name,
      type: data.type as any,
      subtype: (data.subtype ?? "none") as any,
      systemPrompt: data.systemPrompt,
      toolAccess: data.toolAccess ?? [],
      defaultAutonomyTier: (data.defaultAutonomyTier ?? "draft_approve") as any,
      triggerConditions: data.triggerConditions ?? {},
      isSystem: data.isSystem ?? false,
    })
    .returning();

  return template;
}

export async function getBeeTemplates(orgId: string) {
  return db
    .select()
    .from(beeTemplates)
    .where(eq(beeTemplates.orgId, orgId))
    .orderBy(desc(beeTemplates.createdAt));
}

export async function getActiveBeeTemplates(orgId: string) {
  return db
    .select()
    .from(beeTemplates)
    .where(
      and(eq(beeTemplates.orgId, orgId), eq(beeTemplates.isActive, true))
    )
    .orderBy(desc(beeTemplates.createdAt));
}

export async function getBeeTemplate(templateId: string) {
  return db.query.beeTemplates.findFirst({
    where: eq(beeTemplates.id, templateId),
  });
}

export async function updateBeeTemplate(
  templateId: string,
  updates: Partial<{
    name: string;
    systemPrompt: string;
    toolAccess: unknown[];
    defaultAutonomyTier: string;
    triggerConditions: Record<string, unknown>;
    isActive: boolean;
    subtype: string;
  }>
) {
  const values: Record<string, unknown> = { ...updates, updatedAt: new Date() };
  if (updates.defaultAutonomyTier) {
    values.defaultAutonomyTier = updates.defaultAutonomyTier;
  }
  if (updates.subtype) {
    values.subtype = updates.subtype;
  }

  const [updated] = await db
    .update(beeTemplates)
    .set(values as any)
    .where(eq(beeTemplates.id, templateId))
    .returning();

  return updated;
}

export async function deleteBeeTemplate(templateId: string) {
  const [deleted] = await db
    .delete(beeTemplates)
    .where(
      and(
        eq(beeTemplates.id, templateId),
        eq(beeTemplates.isSystem, false)
      )
    )
    .returning();

  return deleted;
}

export async function getSystemBeeTemplates(orgId: string) {
  return db
    .select()
    .from(beeTemplates)
    .where(
      and(eq(beeTemplates.orgId, orgId), eq(beeTemplates.isSystem, true))
    );
}
