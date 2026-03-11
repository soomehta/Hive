import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";

// ─── Workspaces ──────────────────────────────────────────

export async function createWorkspace(data: {
  orgId: string;
  name: string;
  slug: string;
  description?: string;
  iconEmoji?: string;
  color?: string;
  isDefault?: boolean;
  createdBy: string;
}) {
  const [created] = await db
    .insert(workspaces)
    .values({
      orgId: data.orgId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      iconEmoji: data.iconEmoji,
      color: data.color,
      isDefault: data.isDefault ?? false,
      createdBy: data.createdBy,
    })
    .returning();

  return created;
}

export async function getWorkspaces(orgId: string) {
  return db
    .select()
    .from(workspaces)
    .where(eq(workspaces.orgId, orgId))
    .orderBy(asc(workspaces.name));
}

export async function getWorkspace(orgId: string, workspaceId: string) {
  return db.query.workspaces.findFirst({
    where: and(eq(workspaces.orgId, orgId), eq(workspaces.id, workspaceId)),
  });
}

export async function updateWorkspace(
  orgId: string,
  workspaceId: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string | null;
    iconEmoji: string | null;
    color: string | null;
  }>
) {
  const [updated] = await db
    .update(workspaces)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(workspaces.orgId, orgId), eq(workspaces.id, workspaceId)))
    .returning();

  return updated;
}

export async function deleteWorkspace(orgId: string, workspaceId: string) {
  const [deleted] = await db
    .delete(workspaces)
    .where(and(eq(workspaces.orgId, orgId), eq(workspaces.id, workspaceId)))
    .returning();

  return deleted;
}

export async function getDefaultWorkspace(orgId: string) {
  return db.query.workspaces.findFirst({
    where: and(eq(workspaces.orgId, orgId), eq(workspaces.isDefault, true)),
  });
}

// ─── Workspace Members ───────────────────────────────────

export async function addWorkspaceMember(data: {
  workspaceId: string;
  userId: string;
  role?: string;
}) {
  const [created] = await db
    .insert(workspaceMembers)
    .values({
      workspaceId: data.workspaceId,
      userId: data.userId,
      role: data.role ?? "member",
    })
    .returning();

  return created;
}

export async function removeWorkspaceMember(workspaceId: string, userId: string) {
  const [deleted] = await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .returning();

  return deleted;
}

export async function getWorkspaceMembers(workspaceId: string) {
  return db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(asc(workspaceMembers.joinedAt));
}

export async function getUserWorkspaces(userId: string, orgId: string) {
  return db
    .select({
      id: workspaces.id,
      orgId: workspaces.orgId,
      name: workspaces.name,
      slug: workspaces.slug,
      description: workspaces.description,
      iconEmoji: workspaces.iconEmoji,
      color: workspaces.color,
      isDefault: workspaces.isDefault,
      createdBy: workspaces.createdBy,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
    })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(
      and(
        eq(workspaces.orgId, orgId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .orderBy(asc(workspaces.name));
}

export async function isWorkspaceMember(workspaceId: string, userId: string) {
  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  });

  return !!member;
}

export async function getWorkspaceMemberRole(
  workspaceId: string,
  userId: string
): Promise<string | null> {
  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  });

  return member?.role ?? null;
}
