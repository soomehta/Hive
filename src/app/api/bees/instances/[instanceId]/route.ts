import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getBeeInstance,
  updateBeeInstance,
  deleteBeeInstance,
} from "@/lib/db/queries/bee-instances";
import { errorResponse } from "@/lib/utils/errors";
import { z } from "zod";

const updateInstanceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  contextOverrides: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ instanceId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);

    if (!hasPermission(auth.memberRole, "org:manage")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { instanceId } = await params;
    const result = await getBeeInstance(instanceId);
    if (!result || result.instance.orgId !== auth.orgId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateInstanceSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateBeeInstance(instanceId, parsed.data);
    return Response.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);

    if (!hasPermission(auth.memberRole, "org:manage")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { instanceId } = await params;
    const result = await getBeeInstance(instanceId);
    if (!result || result.instance.orgId !== auth.orgId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    await deleteBeeInstance(instanceId);
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
