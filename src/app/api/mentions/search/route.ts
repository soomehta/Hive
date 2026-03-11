import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { errorResponse } from "@/lib/utils/errors";
import { db } from "@/lib/db";
import { organizationMembers, beeInstances, items } from "@/lib/db/schema";
import { and, eq, ilike } from "drizzle-orm";
import { z } from "zod/v4";

// ─── GET /api/mentions/search ────────────────────────────
// Search for mentionable entities (users, agents, items).
// Query params: q (search string), type ("user" | "agent" | "item")

const searchQuerySchema = z.object({
  q: z.string().max(200).optional().default(""),
  type: z.enum(["user", "agent", "item"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    const { searchParams } = new URL(req.url);
    const parsed = searchQuerySchema.safeParse({
      q: searchParams.get("q") ?? "",
      type: searchParams.get("type") ?? undefined,
    });

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { q, type } = parsed.data;
    const searchPattern = `%${q}%`;
    const LIMIT = 10;

    type MentionResult =
      | { id: string; name: string; type: "user" }
      | { id: string; name: string; type: "agent" }
      | { id: string; title: string; type: "item" };

    const results: MentionResult[] = [];

    // ── Users ────────────────────────────────────────────
    if (!type || type === "user") {
      const members = await db
        .select({
          userId: organizationMembers.userId,
          jobTitle: organizationMembers.jobTitle,
        })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, auth.orgId),
            q.length > 0
              ? ilike(organizationMembers.userId, searchPattern)
              : undefined
          )
        )
        .limit(LIMIT);

      for (const m of members) {
        results.push({ id: m.userId, name: m.userId, type: "user" });
      }
    }

    // ── Agents (bee instances) ───────────────────────────
    if (!type || type === "agent") {
      const remaining = LIMIT - results.length;
      if (remaining > 0) {
        const bees = await db
          .select({ id: beeInstances.id, name: beeInstances.name })
          .from(beeInstances)
          .where(
            and(
              eq(beeInstances.orgId, auth.orgId),
              eq(beeInstances.isActive, true),
              q.length > 0 ? ilike(beeInstances.name, searchPattern) : undefined
            )
          )
          .limit(remaining);

        for (const b of bees) {
          results.push({ id: b.id, name: b.name, type: "agent" });
        }
      }
    }

    // ── Items ────────────────────────────────────────────
    if (!type || type === "item") {
      const remaining = LIMIT - results.length;
      if (remaining > 0) {
        const itemRows = await db
          .select({ id: items.id, title: items.title })
          .from(items)
          .where(
            and(
              eq(items.orgId, auth.orgId),
              q.length > 0 ? ilike(items.title, searchPattern) : undefined
            )
          )
          .limit(remaining);

        for (const item of itemRows) {
          results.push({ id: item.id, title: item.title, type: "item" });
        }
      }
    }

    return Response.json({ data: results.slice(0, LIMIT) });
  } catch (error) {
    return errorResponse(error);
  }
}
