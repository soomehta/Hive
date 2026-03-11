import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getItemsByOrg, createItem } from "@/lib/db/queries/items";
import { createItemSchema, itemFiltersSchema } from "@/lib/utils/validation";
import { logActivity } from "@/lib/db/queries/activity";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { errorResponse } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const parsed = itemFiltersSchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = await getItemsByOrg(auth.orgId, parsed.data.type);
    return Response.json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`items:create:${auth.userId}`, 20, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await req.json();
    const parsed = createItemSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (
      parsed.data.type === "page" &&
      !hasPermission(auth.memberRole, "page:create")
    ) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const item = await createItem({
      orgId: auth.orgId,
      projectId: parsed.data.projectId,
      type: parsed.data.type,
      title: parsed.data.title,
      ownerId: auth.userId,
      status: parsed.data.status,
      attributes: parsed.data.attributes,
    });

    await logActivity({
      orgId: auth.orgId,
      projectId: item.projectId,
      userId: auth.userId,
      type: "item_created",
      metadata: { itemId: item.id, itemType: item.type, title: item.title },
    });

    return Response.json({ data: item }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
