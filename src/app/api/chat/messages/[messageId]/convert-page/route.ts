import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getChannelMessageById, getChannelById } from "@/lib/db/queries/chat";
import { createPageItem } from "@/lib/db/queries/pages";
import { logActivity } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ messageId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { messageId } = await params;

    if (!hasPermission(auth.memberRole, "page:create")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const message = await getChannelMessageById(auth.orgId, messageId);
    if (!message) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    const channel = await getChannelById(auth.orgId, message.channelId);
    const body = await req.json().catch(() => ({}));
    const title = (body.title as string) || message.content.slice(0, 200);

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

    const { item, page } = await createPageItem({
      orgId: auth.orgId,
      projectId: channel?.projectId ?? undefined,
      ownerId: auth.userId,
      title,
      contentJson,
      plainText: message.content,
      attributes: { sourceMessageId: messageId, sourceChannelId: message.channelId },
    });

    await logActivity({
      orgId: auth.orgId,
      projectId: channel?.projectId,
      userId: auth.userId,
      type: "message_converted_to_page",
      metadata: { messageId, channelId: message.channelId, itemId: item.id, pageId: page.id },
    });

    return Response.json(
      { data: { itemId: item.id, pageId: page.id } },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
