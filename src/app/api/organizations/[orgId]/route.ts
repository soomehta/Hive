import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { updateOrgSchema } from "@/lib/utils/validation";
import {
  getOrganization,
  updateOrganization,
  deleteOrganization,
} from "@/lib/db/queries/organizations";
import { logActivity } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { orgId } = await params;

    if (auth.orgId !== orgId) {
      return Response.json(
        { error: "Organization mismatch" },
        { status: 403 }
      );
    }

    const org = await getOrganization(orgId);

    if (!org) {
      return Response.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return Response.json({ data: org });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { orgId } = await params;

    if (auth.orgId !== orgId) {
      return Response.json(
        { error: "Organization mismatch" },
        { status: 403 }
      );
    }

    if (!hasPermission(auth.memberRole, "org:manage")) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateOrgSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateOrganization(orgId, parsed.data);

    if (!updated) {
      return Response.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    await logActivity({
      orgId,
      userId: auth.userId,
      type: "project_updated",
      metadata: { action: "org_updated", fields: Object.keys(parsed.data) },
    });

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { orgId } = await params;

    if (auth.orgId !== orgId) {
      return Response.json(
        { error: "Organization mismatch" },
        { status: 403 }
      );
    }

    if (!hasPermission(auth.memberRole, "org:delete")) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const deleted = await deleteOrganization(orgId);

    if (!deleted) {
      return Response.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    await logActivity({
      orgId,
      userId: auth.userId,
      type: "member_left",
      metadata: { action: "org_deleted", orgName: deleted.name },
    });

    return Response.json({ data: { id: deleted.id } });
  } catch (error) {
    return errorResponse(error);
  }
}
