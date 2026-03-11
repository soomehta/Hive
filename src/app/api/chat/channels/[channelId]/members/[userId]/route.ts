import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getChannelById,
  getChannelMembers,
  removeChannelMember,
} from "@/lib/db/queries/chat";
import { logActivity } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ channelId: string; userId: string }>;
}

function canManageMembers(
  role: "owner" | "admin" | "member",
  actorMembershipRole?: "owner" | "moderator" | "member"
) {
  if (hasPermission(role, "chat:member_remove")) return true;
  return actorMembershipRole === "owner" || actorMembershipRole === "moderator";
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { channelId, userId } = await params;
    const channel = await getChannelById(auth.orgId, channelId);
    if (!channel) {
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }

    const members = await getChannelMembers(auth.orgId, channelId);
    const actorMembership = members.find((member) => member.userId === auth.userId);
    if (!canManageMembers(auth.memberRole, actorMembership?.role)) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const removed = await removeChannelMember(auth.orgId, channelId, userId);
    if (!removed) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }

    await logActivity({
      orgId: auth.orgId,
      projectId: channel.projectId,
      userId: auth.userId,
      type: "member_removed_from_channel",
      metadata: { channelId, memberId: userId },
    });

    return Response.json({ data: removed });
  } catch (error) {
    return errorResponse(error);
  }
}
