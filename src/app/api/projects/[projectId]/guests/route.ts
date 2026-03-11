import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getProject } from "@/lib/db/queries/projects";
import { db } from "@/lib/db";
import { projectGuests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { errorResponse } from "@/lib/utils/errors";
import { z } from "zod";

const createGuestSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(["viewer", "commenter"]).default("viewer"),
  expiresInDays: z.number().min(1).max(90).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { projectId } = await params;

    const project = await getProject(projectId);
    if (!project || project.orgId !== auth.orgId) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const guests = await db
      .select()
      .from(projectGuests)
      .where(eq(projectGuests.projectId, projectId));

    return Response.json({ data: guests });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { projectId } = await params;

    if (!hasPermission(auth.memberRole, "project:manage")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const project = await getProject(projectId);
    if (!project || project.orgId !== auth.orgId) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = createGuestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const expiresAt = parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 86400000)
      : null;

    const [guest] = await db
      .insert(projectGuests)
      .values({
        projectId,
        orgId: auth.orgId,
        email: parsed.data.email,
        role: parsed.data.role,
        createdBy: auth.userId,
        expiresAt,
      })
      .returning();

    return Response.json({ data: guest }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { projectId } = await params;

    const url = new URL(req.url);
    const guestId = url.searchParams.get("guestId");
    if (!guestId) {
      return Response.json({ error: "guestId required" }, { status: 400 });
    }

    const project = await getProject(projectId);
    if (!project || project.orgId !== auth.orgId) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    await db
      .delete(projectGuests)
      .where(
        and(
          eq(projectGuests.id, guestId),
          eq(projectGuests.projectId, projectId)
        )
      );

    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
