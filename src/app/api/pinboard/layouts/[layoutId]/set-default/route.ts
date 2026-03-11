import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { updatePinboardLayout } from "@/lib/db/queries/pinboard";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ layoutId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    if (!hasPermission(auth.memberRole, "pinboard:layout_manage_self")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { layoutId } = await params;
    const updated = await updatePinboardLayout(layoutId, auth.orgId, auth.userId, {
      isDefault: true,
    });
    if (!updated) {
      return Response.json({ error: "Layout not found" }, { status: 404 });
    }

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
