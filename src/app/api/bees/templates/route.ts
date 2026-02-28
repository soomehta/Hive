import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import {
  getBeeTemplates,
  createBeeTemplate,
} from "@/lib/db/queries/bee-templates";
import { errorResponse } from "@/lib/utils/errors";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["assistant", "admin", "manager", "operator"]),
  subtype: z
    .enum(["none", "orchestrator", "coordinator", "specialist", "analyst", "compliance"])
    .default("none"),
  systemPrompt: z.string().min(1),
  toolAccess: z.array(z.string()).default([]),
  defaultAutonomyTier: z
    .enum(["auto_execute", "execute_notify", "draft_approve", "suggest_only"])
    .default("draft_approve"),
  triggerConditions: z
    .object({
      intents: z.array(z.string()).optional(),
      keywords: z.array(z.string()).optional(),
    })
    .default({}),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const templates = await getBeeTemplates(auth.orgId);
    return Response.json({ data: templates });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    if (!hasPermission(auth.memberRole, "org:manage")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await rateLimit(`bee-templates:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await req.json();
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const template = await createBeeTemplate({
      orgId: auth.orgId,
      ...parsed.data,
    });

    return Response.json(template, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
