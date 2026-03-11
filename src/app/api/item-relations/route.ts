import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { createItemRelation, getItemById } from "@/lib/db/queries/items";
import { createItemRelationSchema } from "@/lib/utils/validation";
import { logActivity } from "@/lib/db/queries/activity";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { errorResponse } from "@/lib/utils/errors";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`item-relations:create:${auth.userId}`, 30, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    if (!hasPermission(auth.memberRole, "item:link")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createItemRelationSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Validate both items exist and belong to the same org
    const [fromItem, toItem] = await Promise.all([
      getItemById(parsed.data.fromItemId, auth.orgId),
      getItemById(parsed.data.toItemId, auth.orgId),
    ]);

    if (!fromItem || !toItem) {
      return Response.json(
        { error: "One or both items not found in this organization" },
        { status: 404 }
      );
    }

    const relation = await createItemRelation({
      orgId: auth.orgId,
      fromItemId: parsed.data.fromItemId,
      toItemId: parsed.data.toItemId,
      relationType: parsed.data.relationType,
      createdBy: auth.userId,
    });

    await logActivity({
      orgId: auth.orgId,
      userId: auth.userId,
      type: "item_linked",
      metadata: {
        relationId: relation.id,
        fromItemId: parsed.data.fromItemId,
        toItemId: parsed.data.toItemId,
        relationType: parsed.data.relationType,
      },
    });

    return Response.json({ data: relation }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
