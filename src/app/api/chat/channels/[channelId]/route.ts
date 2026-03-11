import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getChannelById, updateChannel } from "@/lib/db/queries/chat";
import { updateChatChannelSchema } from "@/lib/utils/validation";
import { logActivity } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ channelId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { channelId } = await params;
    const channel = await getChannelById(auth.orgId, channelId);
    if (!channel) {
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }
    return Response.json({ data: channel });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { channelId } = await params;
    const channel = await getChannelById(auth.orgId, channelId);
    if (!channel) {
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }

    const canManage = hasPermission(auth.memberRole, "chat:channel_manage");
    const isCreator = channel.createdBy === auth.userId;
    if (!canManage && !isCreator) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateChatChannelSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateChannel(auth.orgId, channelId, parsed.data);

    await logActivity({
      orgId: auth.orgId,
      projectId: channel.projectId,
      userId: auth.userId,
      type: "channel_updated",
      metadata: { channelId, channelName: updated.name },
    });

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { channelId } = await params;
    const channel = await getChannelById(auth.orgId, channelId);
    if (!channel) {
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }

    const canManage = hasPermission(auth.memberRole, "chat:channel_manage");
    const isCreator = channel.createdBy === auth.userId;
    if (!canManage && !isCreator) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Soft-archive by setting isArchived = true
    const archived = await updateChannel(auth.orgId, channelId, { isArchived: true });

    await logActivity({
      orgId: auth.orgId,
      projectId: channel.projectId,
      userId: auth.userId,
      type: "channel_updated",
      metadata: { channelId, channelName: channel.name, action: "archived" },
    });

    return Response.json({ data: archived });
  } catch (error) {
    return errorResponse(error);
  }
}
