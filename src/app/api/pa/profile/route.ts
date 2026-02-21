import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { updatePaProfileSchema } from "@/lib/utils/validation";
import { getOrCreatePaProfile, updatePaProfile } from "@/lib/db/queries/pa-profiles";
import { createLogger } from "@/lib/logger";

const log = createLogger("pa-profile");

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const profile = await getOrCreatePaProfile(auth.userId, auth.orgId);
    return Response.json({ data: profile });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const body = await req.json();
    const parsed = updatePaProfileSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const updates = parsed.data;

    const profile = await updatePaProfile(auth.userId, auth.orgId, updates);
    if (!profile) {
      return Response.json({ error: "Profile not found" }, { status: 404 });
    }

    return Response.json({ data: profile });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "PA profile error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
