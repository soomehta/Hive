import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import {
  getDashboardLayout,
  saveDashboardLayout,
  deleteDashboardLayout,
} from "@/lib/db/queries/dashboard-layouts";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("api-dashboard-layouts");

const saveLayoutSchema = z.object({
  projectId: z.string().uuid().optional(),
  pathway: z.enum(["boards", "lists", "workspace"]),
  layoutPresetIndex: z.number().int().min(0).max(3),
  slots: z.array(
    z.object({
      slotId: z.string(),
      componentType: z.string(),
      config: z.record(z.string(), z.unknown()).default({}),
      x: z.number().int().min(0),
      y: z.number().int().min(0),
      width: z.number().int().min(1),
      height: z.number().int().min(1),
    })
  ),
  isDefault: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") ?? undefined;

    const layout = await getDashboardLayout(
      auth.orgId,
      projectId,
      auth.userId
    );

    return Response.json({ data: layout });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "Failed to get dashboard layout");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    const body = await req.json();
    const parsed = saveLayoutSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const layout = await saveDashboardLayout({
      orgId: auth.orgId,
      userId: auth.userId,
      ...parsed.data,
    });

    return Response.json(layout, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "Failed to save dashboard layout");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const { searchParams } = new URL(req.url);
    const layoutId = searchParams.get("layoutId");

    if (!layoutId || !uuidRegex.test(layoutId)) {
      return Response.json({ error: "Valid layoutId is required" }, { status: 400 });
    }

    const deleted = await deleteDashboardLayout(layoutId, auth.orgId);
    if (!deleted) {
      return Response.json({ error: "Layout not found" }, { status: 404 });
    }

    return Response.json({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "Failed to delete dashboard layout");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
