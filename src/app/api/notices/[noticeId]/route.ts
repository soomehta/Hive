import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getNoticeById, updateNotice, deleteNotice } from "@/lib/db/queries/notices";
import { updateNoticeSchema } from "@/lib/utils/validation";
import { logActivity } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ noticeId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { noticeId } = await params;
    const notice = await getNoticeById(auth.orgId, noticeId);
    if (!notice) {
      return Response.json({ error: "Notice not found" }, { status: 404 });
    }

    const canModerate = hasPermission(auth.memberRole, "notice:moderate");
    const isAuthor = notice.authorId === auth.userId;
    if (!canModerate && !isAuthor) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateNoticeSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateNotice(noticeId, auth.orgId, {
      ...parsed.data,
      startsAt:
        parsed.data.startsAt !== undefined
          ? parsed.data.startsAt
            ? new Date(parsed.data.startsAt)
            : null
          : undefined,
      expiresAt:
        parsed.data.expiresAt !== undefined
          ? parsed.data.expiresAt
            ? new Date(parsed.data.expiresAt)
            : null
          : undefined,
    });

    await logActivity({
      orgId: auth.orgId,
      projectId: notice.projectId,
      userId: auth.userId,
      type: "notice_updated",
      metadata: { noticeId, title: notice.title },
    });

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { noticeId } = await params;
    const notice = await getNoticeById(auth.orgId, noticeId);
    if (!notice) {
      return Response.json({ error: "Notice not found" }, { status: 404 });
    }

    const canModerate = hasPermission(auth.memberRole, "notice:moderate");
    const isAuthor = notice.authorId === auth.userId;
    if (!canModerate && !isAuthor) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const deleted = await deleteNotice(noticeId, auth.orgId);
    return Response.json({ data: deleted });
  } catch (error) {
    return errorResponse(error);
  }
}
