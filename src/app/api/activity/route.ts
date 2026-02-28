import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getActivityFeed } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const params = req.nextUrl.searchParams;

    const result = await getActivityFeed({
      orgId: auth.orgId,
      projectId: params.get("projectId") ?? undefined,
      userId: params.get("userId") ?? undefined,
      type: params.get("type") ?? undefined,
      limit: params.get("limit") ? Number(params.get("limit")) : undefined,
      cursor: params.get("cursor") ?? undefined,
    });

    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
