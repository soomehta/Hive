import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { createChatSession, getChatSessions } from "@/lib/db/queries/pa-actions";
import { errorResponse } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit")) || 30), 50);
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const sessions = await getChatSessions(auth.userId, auth.orgId, limit, offset);

    return Response.json({ data: sessions });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const body = await req.json();
    const title = body.title?.trim() || "New conversation";

    const session = await createChatSession({
      userId: auth.userId,
      orgId: auth.orgId,
      title: title.slice(0, 255),
    });

    return Response.json({ data: session }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
