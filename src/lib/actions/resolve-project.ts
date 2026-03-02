import { db } from "@/lib/db";
import { projectMembers, projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Resolve a projectId for action handlers.
 * If the AI planner provided one, validates membership.
 * If not, picks the user's first available project.
 */
export async function resolveProjectId(
  payloadProjectId: string | undefined | null,
  userId: string,
  orgId: string
): Promise<{ projectId: string } | { error: string }> {
  if (payloadProjectId) {
    // Validate the user is a member of this project
    const membership = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, payloadProjectId),
        eq(projectMembers.userId, userId)
      ),
    });
    if (!membership) {
      return { error: "You don't have access to this project" };
    }
    return { projectId: payloadProjectId };
  }

  // No projectId provided — find the user's first project in this org
  const membership = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(
      and(
        eq(projectMembers.userId, userId),
        eq(projects.orgId, orgId),
        eq(projects.status, "active")
      )
    )
    .limit(1);

  if (membership.length === 0) {
    return { error: "You don't have any active projects. Create a project first." };
  }

  return { projectId: membership[0].projectId };
}
