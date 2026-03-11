import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { createNoticeSchema } from "@/lib/utils/validation";
import { createNotice, getNotices } from "@/lib/db/queries/notices";
import { getProject, isProjectMember, isProjectLead } from "@/lib/db/queries/projects";
import { logActivity } from "@/lib/db/queries/activity";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { errorResponse } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;

    if (projectId) {
      const project = await getProject(projectId);
      if (!project || project.orgId !== auth.orgId) {
        return Response.json({ error: "Project not found" }, { status: 404 });
      }
    }

    const notices = await getNotices(auth.orgId, projectId);
    return Response.json({ data: notices });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`notices:create:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    if (!hasPermission(auth.memberRole, "notice:create")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createNoticeSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.projectId) {
      const project = await getProject(parsed.data.projectId);
      if (!project || project.orgId !== auth.orgId) {
        return Response.json({ error: "Project not found" }, { status: 404 });
      }

      const isMember = await isProjectMember(project.id, auth.userId);
      const isLead = await isProjectLead(project.id, auth.userId);
      const canCreate = hasPermission(auth.memberRole, "notice:create", {
        isProjectMember: isMember,
        isProjectLead: isLead,
      });

      if (!canCreate) {
        return Response.json({ error: "Insufficient permissions" }, { status: 403 });
      }
    }

    const notice = await createNotice({
      orgId: auth.orgId,
      projectId: parsed.data.projectId,
      authorId: auth.userId,
      title: parsed.data.title,
      body: parsed.data.body,
      status: parsed.data.status,
      isPinned: parsed.data.isPinned,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
    });

    await logActivity({
      orgId: auth.orgId,
      projectId: notice.projectId,
      userId: auth.userId,
      type: "notice_created",
      metadata: { noticeId: notice.id, title: notice.title },
    });

    return Response.json({ data: notice }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
