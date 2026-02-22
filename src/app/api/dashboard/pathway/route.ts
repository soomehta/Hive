import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("api-dashboard-pathway");

const setPathwaySchema = z.object({
  pathway: z.enum(["boards", "lists", "workspace"]),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    if (!hasPermission(auth.memberRole, "org:manage")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = setPathwaySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(organizations)
      .set({
        pathway: parsed.data.pathway,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, auth.orgId))
      .returning();

    return Response.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "Failed to set pathway");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
