import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { createProjectSchema } from "@/lib/utils/validation";
import { getProjectsWithStats, createProject } from "@/lib/db/queries/projects";
import { logActivity } from "@/lib/db/queries/activity";
import { createNotification } from "@/lib/notifications/in-app";
import { createItem } from "@/lib/db/queries/items";
import { createTask } from "@/lib/db/queries/tasks";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { errorResponse } from "@/lib/utils/errors";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { getTemplate } from "@/lib/data/project-templates";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const projectList = await getProjectsWithStats(auth.orgId);

    return Response.json({ data: projectList });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`projects:create:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    if (!hasPermission(auth.memberRole, "project:create")) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Validate memberIds belong to the org
    if (parsed.data.memberIds?.length) {
      const validMembers = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, auth.orgId),
            inArray(organizationMembers.userId, parsed.data.memberIds)
          )
        );
      const validIds = new Set(validMembers.map((m) => m.userId));
      const invalidIds = parsed.data.memberIds.filter((id) => !validIds.has(id));
      if (invalidIds.length > 0) {
        return Response.json(
          { error: "Some members are not part of this organization", invalidIds },
          { status: 400 }
        );
      }
    }

    const project = await createProject({
      orgId: auth.orgId,
      name: parsed.data.name,
      description: parsed.data.description,
      color: parsed.data.color,
      startDate: parsed.data.startDate,
      targetDate: parsed.data.targetDate,
      createdBy: auth.userId,
      memberIds: parsed.data.memberIds,
    });

    // Create corresponding items row for the item graph
    await createItem({
      orgId: auth.orgId,
      projectId: project.id,
      type: "project",
      title: project.name,
      ownerId: auth.userId,
      status: project.status,
      sourceId: project.id,
    }).catch((err) => {
      console.error("[items] failed to create item for project", project.id, err);
    });

    // Create tasks from template
    const templateId = body.templateId as string | undefined;
    if (templateId && templateId !== "blank") {
      const template = getTemplate(templateId);
      if (template) {
        for (const tmplTask of template.defaultTasks) {
          const task = await createTask({
            projectId: project.id,
            orgId: auth.orgId,
            title: tmplTask.title,
            description: tmplTask.description,
            status: tmplTask.status,
            priority: tmplTask.priority,
            createdBy: auth.userId,
          });
          await createItem({
            orgId: auth.orgId,
            projectId: project.id,
            type: "task",
            title: task.title,
            ownerId: auth.userId,
            status: task.status,
            sourceId: task.id,
          }).catch(() => {});
        }
      }
    }

    await logActivity({
      orgId: auth.orgId,
      projectId: project.id,
      userId: auth.userId,
      type: "project_created",
      metadata: { projectName: project.name },
    });

    // Enqueue embedding for semantic search
    const { enqueueEmbedding } = await import("@/lib/queue/jobs");
    enqueueEmbedding("project", project.id, `${project.name} ${project.description ?? ""}`, auth.orgId).catch(() => {});

    // Notify added members
    if (parsed.data.memberIds?.length) {
      for (const memberId of parsed.data.memberIds) {
        if (memberId !== auth.userId) {
          await createNotification({
            userId: memberId,
            orgId: auth.orgId,
            type: "project_created",
            title: `You were added to project "${project.name}"`,
            metadata: { projectId: project.id },
          });
        }
      }
    }

    return Response.json({ data: project }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
