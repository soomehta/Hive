import { db } from "@/lib/db";
import { projects, projectMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// ─── Read Queries ───────────────────────────────────────

export async function getProjects(orgId: string) {
  return db
    .select()
    .from(projects)
    .where(eq(projects.orgId, orgId))
    .orderBy(desc(projects.createdAt));
}

export async function getProject(projectId: string) {
  return db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
}

// ─── Write Queries ──────────────────────────────────────

export async function createProject(data: {
  orgId: string;
  name: string;
  description?: string;
  color?: string;
  startDate?: string;
  targetDate?: string;
  createdBy: string;
  memberIds?: string[];
}) {
  return db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        orgId: data.orgId,
        name: data.name,
        description: data.description,
        color: data.color,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        createdBy: data.createdBy,
      })
      .returning();

    // Add creator as project lead
    await tx.insert(projectMembers).values({
      projectId: project.id,
      userId: data.createdBy,
      role: "lead",
    });

    // Add optional additional members
    if (data.memberIds && data.memberIds.length > 0) {
      const memberValues = data.memberIds
        .filter((id) => id !== data.createdBy) // avoid duplicate for creator
        .map((userId) => ({
          projectId: project.id,
          userId,
          role: "member",
        }));

      if (memberValues.length > 0) {
        await tx.insert(projectMembers).values(memberValues);
      }
    }

    return project;
  });
}

export async function updateProject(
  projectId: string,
  data: Partial<{
    name: string;
    description: string | null;
    status: "active" | "paused" | "completed" | "archived";
    color: string | null;
    startDate: string | null;
    targetDate: string | null;
  }>
) {
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.startDate !== undefined)
    updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.targetDate !== undefined)
    updateData.targetDate = data.targetDate ? new Date(data.targetDate) : null;

  const [updated] = await db
    .update(projects)
    .set(updateData)
    .where(eq(projects.id, projectId))
    .returning();

  return updated;
}

export async function deleteProject(projectId: string) {
  const [deleted] = await db
    .delete(projects)
    .where(eq(projects.id, projectId))
    .returning();

  return deleted;
}

// ─── Member Queries ─────────────────────────────────────

export async function getProjectMembers(projectId: string) {
  return db
    .select()
    .from(projectMembers)
    .where(eq(projectMembers.projectId, projectId));
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: string = "member"
) {
  const [member] = await db
    .insert(projectMembers)
    .values({ projectId, userId, role })
    .returning();

  return member;
}

export async function removeProjectMember(
  projectId: string,
  userId: string
) {
  const [removed] = await db
    .delete(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      )
    )
    .returning();

  return removed;
}

export async function isProjectMember(
  projectId: string,
  userId: string
): Promise<boolean> {
  const member = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, userId)
    ),
  });

  return !!member;
}

export async function isProjectLead(
  projectId: string,
  userId: string
): Promise<boolean> {
  const member = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, userId)
    ),
  });

  return !!member && member.role === "lead";
}
