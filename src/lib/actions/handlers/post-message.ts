import { createMessage } from "@/lib/db/queries/messages";
import { logActivity } from "@/lib/db/queries/activity";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handlePostMessage(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.projectId || !payload.content) {
    return { success: false, error: "Project ID and content are required" };
  }

  const message = await createMessage({
    projectId: payload.projectId,
    orgId: action.orgId,
    userId: action.userId,
    title: payload.title,
    content: payload.content,
  });

  await logActivity({
    orgId: action.orgId,
    projectId: payload.projectId,
    userId: action.userId,
    type: "message_posted",
    metadata: { messageId: message.id, postedByPa: true },
  });

  return { success: true, result: { messageId: message.id } };
}
