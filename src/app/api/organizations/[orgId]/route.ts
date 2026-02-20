import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { updateOrgSchema } from "@/lib/utils/validation";
import {
  getOrganization,
  updateOrganization,
  deleteOrganization,
} from "@/lib/db/queries/organizations";

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
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/organizations/[orgId] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
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

    return Response.json({ data: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("PATCH /api/organizations/[orgId] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
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

    if (!hasPermission(auth.memberRole, "org:manage")) {
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

    return Response.json({ data: { id: deleted.id } });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("DELETE /api/organizations/[orgId] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
