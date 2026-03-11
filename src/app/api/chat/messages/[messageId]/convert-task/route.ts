import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getChannelMessageById, getChannelById } from "@/lib/db/queries/chat";
import { createTask } from "@/lib/db/queries/tasks";
import { createItem } from "@/lib/db/queries/items";
import { logActivity } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ messageId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { messageId } = await params;

    if (!hasPermission(auth.memberRole, "task:create")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const message = await getChannelMessageById(auth.orgId, messageId);
    if (!message) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    const channel = await getChannelById(auth.orgId, message.channelId);

    const body = await req.json().catch(() => ({}));
    const title = (body.title as string) || message.content.slice(0, 200);
    const projectId = (body.projectId as string) || channel?.projectId || undefined;

    if (!projectId) {
      return Response.json(
        { error: "projectId is required (channel is not project-scoped)" },
        { status: 400 }
      );
    }

    const task = await createTask({
      orgId: auth.orgId,
      projectId,
      title,
      description: message.content,
      createdBy: auth.userId,
    });

    // Create items row and link to source message's channel item
    const taskItem = await createItem({
      orgId: auth.orgId,
      projectId,
      type: "task",
      title: task.title,
      ownerId: auth.userId,
      status: task.status,
    }).catch(() => null);

    await logActivity({
      orgId: auth.orgId,
      projectId,
      taskId: task.id,
      userId: auth.userId,
      type: "message_converted_to_task",
      metadata: { messageId, channelId: message.channelId, taskId: task.id },
    });

    return Response.json({ data: { taskId: task.id } }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
