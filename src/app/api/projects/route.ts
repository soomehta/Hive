import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { createProjectSchema } from "@/lib/utils/validation";
import { getProjects, createProject } from "@/lib/db/queries/projects";
import { logActivity } from "@/lib/db/queries/activity";
import { createNotification } from "@/lib/notifications/in-app";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { errorResponse } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const projectList = await getProjects(auth.orgId);

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

    await logActivity({
      orgId: auth.orgId,
      projectId: project.id,
      userId: auth.userId,
      type: "project_created",
      metadata: { projectName: project.name },
    });

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
