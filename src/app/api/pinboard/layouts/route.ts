import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getUserPinboardLayouts,
  createPinboardLayout,
} from "@/lib/db/queries/pinboard";
import { createPinboardLayoutSchema } from "@/lib/utils/validation";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { isFeatureEnabled } from "@/lib/utils/feature-flags";
import { errorResponse } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  if (!isFeatureEnabled("pinboard")) {
    return Response.json({ error: "Pinboard feature is disabled" }, { status: 404 });
  }
  try {
    const auth = await authenticateRequest(req);
    const layouts = await getUserPinboardLayouts(auth.orgId, auth.userId);
    return Response.json({ data: layouts });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`pinboard:layout:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    if (!hasPermission(auth.memberRole, "pinboard:layout_manage_self")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createPinboardLayoutSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const created = await createPinboardLayout({
      orgId: auth.orgId,
      userId: auth.userId,
      name: parsed.data.name,
      theme: parsed.data.theme,
      isDefault: parsed.data.isDefault,
      layoutJson: parsed.data.layoutJson,
    });

    return Response.json({ data: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
