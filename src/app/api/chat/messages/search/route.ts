import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getChannels, searchChannelMessages } from "@/lib/db/queries/chat";
import { errorResponse } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const url = new URL(req.url);
    const query = url.searchParams.get("query")?.trim();

    if (!query || query.length < 2) {
      return Response.json({ error: "Query must be at least 2 characters" }, { status: 400 });
    }

    // Get all channels the user has access to (permission filtering)
    const channels = await getChannels(auth.orgId);
    const channelIds = channels.map((c: any) => c.id);

    const messages = await searchChannelMessages(auth.orgId, channelIds, query, 20);

    return Response.json({ data: messages });
  } catch (error) {
    return errorResponse(error);
  }
}
