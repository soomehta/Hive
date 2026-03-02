import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import {
  getChatSession,
  getChatSessionMessages,
  updateChatSessionTitle,
  deleteChatSession,
} from "@/lib/db/queries/pa-actions";
import { errorResponse } from "@/lib/utils/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { sessionId } = await params;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit")) || 50), 100);
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const session = await getChatSession(sessionId);
    if (!session || session.userId !== auth.userId || session.orgId !== auth.orgId) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    const messages = await getChatSessionMessages(sessionId, limit, offset);

    return Response.json({
      data: {
        session,
        messages,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { sessionId } = await params;

    const session = await getChatSession(sessionId);
    if (!session || session.userId !== auth.userId || session.orgId !== auth.orgId) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    const body = await req.json();
    if (!body.title?.trim()) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }

    const updated = await updateChatSessionTitle(sessionId, body.title.trim().slice(0, 255));

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { sessionId } = await params;

    const session = await getChatSession(sessionId);
    if (!session || session.userId !== auth.userId || session.orgId !== auth.orgId) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    await deleteChatSession(sessionId);

    return Response.json({ data: { deleted: true } });
  } catch (error) {
    return errorResponse(error);
  }
}
