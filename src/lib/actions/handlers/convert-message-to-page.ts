import { getChannelMessageById } from "@/lib/db/queries/chat";
import { createPageItem } from "@/lib/db/queries/pages";
import { logActivity } from "@/lib/db/queries/activity";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleConvertMessageToPage(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.messageId) {
    return { success: false, error: "messageId is required" };
  }

  const message = await getChannelMessageById(action.orgId, payload.messageId);
  if (!message) {
    return { success: false, error: "Message not found" };
  }

  const title = payload.title || message.content.slice(0, 100);

  const contentJson: Record<string, unknown> = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: message.content
          ? [{ type: "text", text: message.content }]
          : [],
      },
    ],
  };

  const result = await createPageItem({
    orgId: action.orgId,
    ownerId: action.userId,
    title,
    projectId: payload.projectId ?? null,
    contentJson,
    plainText: message.content,
  });

  await logActivity({
    orgId: action.orgId,
    userId: action.userId,
    type: "message_converted_to_page",
    metadata: {
      messageId: payload.messageId,
      itemId: result.item.id,
      pageId: result.page.id,
      title,
      createdByPa: true,
    },
  });

  return { success: true, result: { itemId: result.item.id, pageId: result.page.id, title } };
}
