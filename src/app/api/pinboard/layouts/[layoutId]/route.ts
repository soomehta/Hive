import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import {
  updatePinboardLayout,
  deletePinboardLayout,
  getUserPinboardLayouts,
} from "@/lib/db/queries/pinboard";
import { updatePinboardLayoutSchema } from "@/lib/utils/validation";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ layoutId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { layoutId } = await params;
    const allLayouts = await getUserPinboardLayouts(auth.orgId, auth.userId);
    const layout = allLayouts.find((l) => l.id === layoutId);
    if (!layout) {
      return Response.json({ error: "Layout not found" }, { status: 404 });
    }
    return Response.json({ data: layout });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    if (!hasPermission(auth.memberRole, "pinboard:layout_manage_self")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { layoutId } = await params;
    const body = await req.json();
    const parsed = updatePinboardLayoutSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updatePinboardLayout(
      layoutId,
      auth.orgId,
      auth.userId,
      parsed.data
    );
    if (!updated) {
      return Response.json({ error: "Layout not found" }, { status: 404 });
    }

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    if (!hasPermission(auth.memberRole, "pinboard:layout_manage_self")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { layoutId } = await params;
    const allLayouts = await getUserPinboardLayouts(auth.orgId, auth.userId);
    const target = allLayouts.find((layout) => layout.id === layoutId);
    if (!target) {
      return Response.json({ error: "Layout not found" }, { status: 404 });
    }

    if (target.isDefault && allLayouts.length > 1) {
      return Response.json(
        { error: "Set another default layout before deleting this one" },
        { status: 400 }
      );
    }

    const deleted = await deletePinboardLayout(layoutId, auth.orgId, auth.userId);
    return Response.json({ data: deleted });
  } catch (error) {
    return errorResponse(error);
  }
}
