import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { errorResponse } from "@/lib/utils/errors";
import { db } from "@/lib/db";
import { checkinPreferences } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";

// ─── GET /api/checkins/preferences ───────────────────────
// Get the current user's check-in preferences for their org.

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    const prefs = await db.query.checkinPreferences.findFirst({
      where: and(
        eq(checkinPreferences.userId, auth.userId),
        eq(checkinPreferences.orgId, auth.orgId)
      ),
    });

    return Response.json({ data: prefs ?? null });
  } catch (error) {
    return errorResponse(error);
  }
}

// ─── PUT /api/checkins/preferences ───────────────────────
// Upsert check-in preferences for the current user in their org.

const timeRegex = /^\d{2}:\d{2}$/;

const updatePrefsSchema = z.object({
  frequency: z.enum(["daily", "standard", "minimal", "off"]).optional(),
  preferredTime: z.string().regex(timeRegex).optional(),
  quietHoursStart: z.string().regex(timeRegex).optional(),
  quietHoursEnd: z.string().regex(timeRegex).optional(),
  maxCheckinsPerDay: z.number().int().min(0).max(20).optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    const rl = await rateLimit(`checkin:prefs:${auth.userId}`, 20, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await req.json();
    const parsed = updatePrefsSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.query.checkinPreferences.findFirst({
      where: and(
        eq(checkinPreferences.userId, auth.userId),
        eq(checkinPreferences.orgId, auth.orgId)
      ),
      columns: { id: true },
    });

    const now = new Date();

    if (existing) {
      const [updated] = await db
        .update(checkinPreferences)
        .set({
          ...(parsed.data.frequency !== undefined && { frequency: parsed.data.frequency }),
          ...(parsed.data.preferredTime !== undefined && { preferredTime: parsed.data.preferredTime }),
          ...(parsed.data.quietHoursStart !== undefined && { quietHoursStart: parsed.data.quietHoursStart }),
          ...(parsed.data.quietHoursEnd !== undefined && { quietHoursEnd: parsed.data.quietHoursEnd }),
          ...(parsed.data.maxCheckinsPerDay !== undefined && { maxCheckinsPerDay: parsed.data.maxCheckinsPerDay }),
          updatedAt: now,
        })
        .where(
          and(
            eq(checkinPreferences.userId, auth.userId),
            eq(checkinPreferences.orgId, auth.orgId)
          )
        )
        .returning();

      return Response.json({ data: updated });
    }

    // Insert with defaults where not provided.
    const [created] = await db
      .insert(checkinPreferences)
      .values({
        userId: auth.userId,
        orgId: auth.orgId,
        frequency: parsed.data.frequency ?? "standard",
        preferredTime: parsed.data.preferredTime ?? "10:00",
        quietHoursStart: parsed.data.quietHoursStart ?? "18:00",
        quietHoursEnd: parsed.data.quietHoursEnd ?? "08:00",
        maxCheckinsPerDay: parsed.data.maxCheckinsPerDay ?? 5,
      })
      .returning();

    return Response.json({ data: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
