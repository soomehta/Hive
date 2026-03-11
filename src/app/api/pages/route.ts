import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getPageItemsByOrg } from "@/lib/db/queries/items";
import { createPageItem } from "@/lib/db/queries/pages";
import { logActivity } from "@/lib/db/queries/activity";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { isFeatureEnabled } from "@/lib/utils/feature-flags";
import { errorResponse } from "@/lib/utils/errors";

const createPageSchema = z.object({
  title: z.string().min(1).max(500),
  projectId: z.string().uuid().optional(),
  contentJson: z.record(z.string(), z.unknown()).optional(),
  plainText: z.string().optional(),
});

/**
 * GET /api/pages — List page items owned by the current user in the org.
 */
export async function GET(req: NextRequest) {
  if (!isFeatureEnabled("canvas")) {
    return Response.json({ error: "Canvas pages feature is disabled" }, { status: 404 });
  }
  try {
    const auth = await authenticateRequest(req);
    if (!hasPermission(auth.memberRole, "page:read")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const projectId = req.nextUrl.searchParams.get("projectId") || undefined;
    const pageItems = await getPageItemsByOrg(auth.orgId, projectId);
    return Response.json({ data: pageItems });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/pages — Create a new standalone page.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`pages:create:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    if (!hasPermission(auth.memberRole, "page:create")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createPageSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await createPageItem({
      orgId: auth.orgId,
      ownerId: auth.userId,
      title: parsed.data.title,
      projectId: parsed.data.projectId,
      contentJson: parsed.data.contentJson,
      plainText: parsed.data.plainText,
    });

    await logActivity({
      orgId: auth.orgId,
      userId: auth.userId,
      type: "page_created",
      metadata: { itemId: result.item.id, title: parsed.data.title },
    });

    // Enqueue embedding for semantic search
    const { enqueueEmbedding } = await import("@/lib/queue/jobs");
    enqueueEmbedding("page", result.item.id, `${parsed.data.title} ${parsed.data.plainText ?? ""}`, auth.orgId).catch(() => {});

    return Response.json({ data: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
