import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getItemById, getItemBacklinks } from "@/lib/db/queries/items";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { itemId } = await params;

    const item = await getItemById(itemId, auth.orgId);
    if (!item) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    const backlinks = await getItemBacklinks(itemId, auth.orgId);
    return Response.json({ data: backlinks });
  } catch (error) {
    return errorResponse(error);
  }
}
