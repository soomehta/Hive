import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { updateProjectSchema } from "@/lib/utils/validation";
import {
  getProject,
  updateProject,
  deleteProject,
  isProjectMember,
  isProjectLead,
} from "@/lib/db/queries/projects";
import { logActivity } from "@/lib/db/queries/activity";
import { createLogger } from "@/lib/logger";

const log = createLogger("projects");

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { projectId } = await params;

    const project = await getProject(projectId);

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.orgId !== auth.orgId) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Admins and owners can always access; members need project membership
    if (auth.memberRole === "member") {
      const isMember = await isProjectMember(projectId, auth.userId);
      if (!isMember) {
        return Response.json(
          { error: "Not a member of this project" },
          { status: 403 }
        );
      }
    }

    return Response.json({ data: project });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "GET /api/projects/[projectId] error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { projectId } = await params;

    const project = await getProject(projectId);

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.orgId !== auth.orgId) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Check permission — members can manage if they are project lead
    const lead = await isProjectLead(projectId, auth.userId);
    if (
      !hasPermission(auth.memberRole, "project:manage", {
        isProjectLead: lead,
      })
    ) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateProject(projectId, parsed.data);

    await logActivity({
      orgId: auth.orgId,
      projectId,
      userId: auth.userId,
      type: "project_updated",
      metadata: { projectName: project.name, fields: Object.keys(parsed.data) },
    });

    return Response.json({ data: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "PATCH /api/projects/[projectId] error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { projectId } = await params;

    const project = await getProject(projectId);

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.orgId !== auth.orgId) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Check permission — members can manage if they are project lead
    const lead = await isProjectLead(projectId, auth.userId);
    if (
      !hasPermission(auth.memberRole, "project:manage", {
        isProjectLead: lead,
      })
    ) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await deleteProject(projectId);

    return Response.json({ data: { success: true } });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "DELETE /api/projects/[projectId] error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
