import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import {
  getNotifications,
  markNotificationsRead,
} from "@/lib/notifications/in-app";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const limit = req.nextUrl.searchParams.get("limit");

    const data = await getNotifications(
      auth.userId,
      auth.orgId,
      limit ? Number(limit) : undefined
    );

    return Response.json({ data });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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

    await markNotificationsRead(ids);

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
