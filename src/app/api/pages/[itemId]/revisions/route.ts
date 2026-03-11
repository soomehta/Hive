import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getItemById } from "@/lib/db/queries/items";
import { getPageByItemId, getPageRevisions } from "@/lib/db/queries/pages";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { itemId } = await params;

    if (!hasPermission(auth.memberRole, "page:read")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const item = await getItemById(itemId, auth.orgId);
    if (!item) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    const page = await getPageByItemId(itemId, auth.orgId);
    if (!page) {
      return Response.json({ error: "Page not found" }, { status: 404 });
    }

    const revisions = await getPageRevisions(page.id, auth.orgId);
    return Response.json({ data: revisions });
  } catch (error) {
    return errorResponse(error);
  }
}
