import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import {
  getNotifications,
  markNotificationsRead,
} from "@/lib/notifications/in-app";
import { errorResponse } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rawLimit = req.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(1, parseInt(rawLimit ?? "20", 10) || 20), 100);

    const data = await getNotifications(
      auth.userId,
      auth.orgId,
      limit
    );

    return Response.json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const body = await req.json();

    const ids = body.ids as string[];
    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json(
        { error: "ids array required" },
        { status: 400 }
      );
    }

    await markNotificationsRead(ids, auth.userId, auth.orgId);

    return Response.json({ data: { success: true } });
  } catch (error) {
    return errorResponse(error);
  }
}
