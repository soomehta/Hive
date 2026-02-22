import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import {
  getBeeInstances,
  createBeeInstance,
} from "@/lib/db/queries/bee-instances";
import { getBeeTemplate } from "@/lib/db/queries/bee-templates";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("api-bee-instances");

const createInstanceSchema = z.object({
  templateId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  contextOverrides: z.record(z.string(), z.unknown()).default({}),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") ?? undefined;

    const instances = await getBeeInstances(auth.orgId, projectId);
    return Response.json({ data: instances });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "Failed to list bee instances");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    if (!hasPermission(auth.memberRole, "org:manage")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await rateLimit(`bee-instances:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await req.json();
    const parsed = createInstanceSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify template belongs to the org
    const template = await getBeeTemplate(parsed.data.templateId);
    if (!template || template.orgId !== auth.orgId) {
      return Response.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const instance = await createBeeInstance({
      ...parsed.data,
      orgId: auth.orgId,
    });

    return Response.json(instance, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "Failed to create bee instance");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
