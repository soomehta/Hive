import { createMessage } from "@/lib/db/queries/messages";
import { logActivity } from "@/lib/db/queries/activity";
import { resolveProjectId } from "../resolve-project";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handlePostMessage(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.content) {
    return { success: false, error: "Message content is required" };
  }

  const resolved = await resolveProjectId(payload.projectId, action.userId, action.orgId);
  if ("error" in resolved) {
    return { success: false, error: resolved.error };
  }
  const { projectId } = resolved;

  const message = await createMessage({
    projectId,
    orgId: action.orgId,
    userId: action.userId,
    title: payload.title,
    content: payload.content,
  });

  await logActivity({
    orgId: action.orgId,
    projectId,
    userId: action.userId,
    type: "message_posted",
    metadata: { messageId: message.id, postedByPa: true },
  });

  return { success: true, result: { messageId: message.id } };
}
