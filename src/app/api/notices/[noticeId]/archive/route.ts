import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getNoticeById, updateNotice } from "@/lib/db/queries/notices";
import { logActivity } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ noticeId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { noticeId } = await params;

    const notice = await getNoticeById(auth.orgId, noticeId);
    if (!notice) {
      return Response.json({ error: "Notice not found" }, { status: 404 });
    }

    if (!hasPermission(auth.memberRole, "notice:archive")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const updated = await updateNotice(noticeId, auth.orgId, { status: "archived" });

    await logActivity({
      orgId: auth.orgId,
      projectId: notice.projectId,
      userId: auth.userId,
      type: "notice_archived",
      metadata: { noticeId, title: notice.title },
    });

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
