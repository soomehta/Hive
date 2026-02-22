import { db } from "@/lib/db";
import { dashboardLayouts } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

export async function getDashboardLayout(
  orgId: string,
  projectId?: string,
  userId?: string
) {
  // Try user-specific layout first
  if (userId) {
    const userLayout = await db.query.dashboardLayouts.findFirst({
      where: and(
        eq(dashboardLayouts.orgId, orgId),
        userId ? eq(dashboardLayouts.userId, userId) : undefined,
        projectId
          ? eq(dashboardLayouts.projectId, projectId)
          : isNull(dashboardLayouts.projectId)
      ),
    });
    if (userLayout) return userLayout;
  }

  // Try project default
  if (projectId) {
    const projectLayout = await db.query.dashboardLayouts.findFirst({
      where: and(
        eq(dashboardLayouts.orgId, orgId),
        eq(dashboardLayouts.projectId, projectId),
        isNull(dashboardLayouts.userId),
        eq(dashboardLayouts.isDefault, true)
      ),
    });
    if (projectLayout) return projectLayout;
  }

  // Try org default
  const orgLayout = await db.query.dashboardLayouts.findFirst({
    where: and(
      eq(dashboardLayouts.orgId, orgId),
      isNull(dashboardLayouts.projectId),
      isNull(dashboardLayouts.userId),
      eq(dashboardLayouts.isDefault, true)
    ),
  });

  return orgLayout ?? null;
}

export async function saveDashboardLayout(data: {
  orgId: string;
  projectId?: string;
  userId?: string;
  pathway: string;
  layoutPresetIndex: number;
  slots: unknown;
  isDefault?: boolean;
}) {
  // Upsert: check if exists
  const existing = await getDashboardLayout(
    data.orgId,
    data.projectId,
    data.userId
  );

  if (existing) {
    const [updated] = await db
      .update(dashboardLayouts)
      .set({
        pathway: data.pathway as any,
        layoutPresetIndex: data.layoutPresetIndex,
        slots: data.slots as any,
        isDefault: data.isDefault ?? existing.isDefault,
        updatedAt: new Date(),
      })
      .where(eq(dashboardLayouts.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(dashboardLayouts)
    .values({
      orgId: data.orgId,
      projectId: data.projectId,
      userId: data.userId,
      pathway: data.pathway as any,
      layoutPresetIndex: data.layoutPresetIndex,
      slots: data.slots as any,
      isDefault: data.isDefault ?? false,
    })
    .returning();

  return created;
}

export async function deleteDashboardLayout(layoutId: string) {
  const [deleted] = await db
    .delete(dashboardLayouts)
    .where(eq(dashboardLayouts.id, layoutId))
    .returning();

  return deleted;
}
