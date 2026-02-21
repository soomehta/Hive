import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  isProjectLead,
} from "@/lib/db/queries/projects";
import { logActivity } from "@/lib/db/queries/activity";
import { createNotification } from "@/lib/notifications/in-app";
import { createLogger } from "@/lib/logger";

const log = createLogger("project-members");

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

    const members = await getProjectMembers(projectId);

    return Response.json({ data: members });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "GET /api/projects/[projectId]/members error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
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
    const { userId, role } = body;

    if (!userId || typeof userId !== "string") {
      return Response.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const member = await addProjectMember(
      projectId,
      userId,
      role || "member"
    );

    await logActivity({
      orgId: auth.orgId,
      projectId,
      userId: auth.userId,
      type: "member_joined",
      metadata: { addedUserId: userId, projectName: project.name },
    });

    if (userId !== auth.userId) {
      await createNotification({
        userId,
        orgId: auth.orgId,
        type: "project_created",
        title: `You were added to project "${project.name}"`,
        metadata: { projectId },
      });
    }

    return Response.json({ data: member }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "POST /api/projects/[projectId]/members error");
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

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json(
        { error: "userId query parameter is required" },
        { status: 400 }
      );
    }

    const removed = await removeProjectMember(projectId, userId);

    if (!removed) {
      return Response.json(
        { error: "Member not found in project" },
        { status: 404 }
      );
    }

    await logActivity({
      orgId: auth.orgId,
      projectId,
      userId: auth.userId,
      type: "member_left",
      metadata: { removedUserId: userId, projectName: project.name },
    });

    return Response.json({ data: { success: true } });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "DELETE /api/projects/[projectId]/members error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
