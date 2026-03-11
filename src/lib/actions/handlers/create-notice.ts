import { createNotice } from "@/lib/db/queries/notices";
import { logActivity } from "@/lib/db/queries/activity";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleCreateNotice(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  const title = payload.title?.trim();
  const body = payload.body?.trim();
  if (!title || !body) {
    return { success: false, error: "Notice title and body are required" };
  }

  const notice = await createNotice({
    orgId: action.orgId,
    authorId: action.userId,
    title,
    body,
    status: payload.status || "active",
    isPinned: payload.isPinned ?? false,
    projectId: payload.projectId ?? null,
    startsAt: payload.startsAt ? new Date(payload.startsAt) : undefined,
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
  });

  await logActivity({
    orgId: action.orgId,
    userId: action.userId,
    type: "notice_created",
    metadata: { noticeId: notice.id, title, createdByPa: true },
  });

  return { success: true, result: { noticeId: notice.id } };
}
