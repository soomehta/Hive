import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { errorResponse } from "@/lib/utils/errors";
import { db } from "@/lib/db";
import { paProfiles } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";

// ─── GET /api/pa/primary-channel ────────────────────────
// Returns the user's PA profile primary_channel_id.

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    const profile = await db.query.paProfiles.findFirst({
      where: and(
        eq(paProfiles.userId, auth.userId),
        eq(paProfiles.orgId, auth.orgId)
      ),
      columns: { primaryChannelId: true },
    });

    return Response.json({ data: { channelId: profile?.primaryChannelId ?? null } });
  } catch (error) {
    return errorResponse(error);
  }
}

// ─── PUT /api/pa/primary-channel ────────────────────────
// Update primary_channel_id on the user's PA profile.

const updatePrimaryChannelSchema = z.object({
  channelId: z.uuid(),
});

export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    const rl = await rateLimit(`pa:primary-channel:${auth.userId}`, 20, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await req.json();
    const parsed = updatePrimaryChannelSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Upsert: update if exists, otherwise insert a minimal profile row.
    const existing = await db.query.paProfiles.findFirst({
      where: and(
        eq(paProfiles.userId, auth.userId),
        eq(paProfiles.orgId, auth.orgId)
      ),
      columns: { id: true },
    });

    if (existing) {
      await db
        .update(paProfiles)
        .set({ primaryChannelId: parsed.data.channelId, updatedAt: new Date() })
        .where(
          and(
            eq(paProfiles.userId, auth.userId),
            eq(paProfiles.orgId, auth.orgId)
          )
        );
    } else {
      await db.insert(paProfiles).values({
        userId: auth.userId,
        orgId: auth.orgId,
        primaryChannelId: parsed.data.channelId,
      });
    }

    return Response.json({ data: { channelId: parsed.data.channelId } });
  } catch (error) {
    return errorResponse(error);
  }
}
