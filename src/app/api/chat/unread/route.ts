import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getUnreadCounts } from "@/lib/db/queries/chat";
import { errorResponse } from "@/lib/utils/errors";

/**
 * GET /api/chat/unread — Return unread message counts per channel for the current user.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const counts = await getUnreadCounts(auth.orgId, auth.userId);
    return Response.json({ data: counts });
  } catch (error) {
    return errorResponse(error);
  }
}
