import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { markChannelRead } from "@/lib/db/queries/chat";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ channelId: string }>;
}

/**
 * POST /api/chat/channels/[channelId]/read — Mark channel as read for the current user.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { channelId } = await params;

    const updated = await markChannelRead(auth.orgId, channelId, auth.userId);
    if (!updated) {
      return Response.json({ error: "Not a member of this channel" }, { status: 404 });
    }

    return Response.json({ data: { channelId, lastReadAt: updated.lastReadAt } });
  } catch (error) {
    return errorResponse(error);
  }
}
