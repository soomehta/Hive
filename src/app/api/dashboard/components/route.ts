import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { getComponentsForPathway, COMPONENT_DEFINITIONS } from "@/lib/dashboard/component-registry";
import type { Pathway } from "@/types/bees";
import { createLogger } from "@/lib/logger";

const log = createLogger("api-dashboard-components");

export async function GET(req: NextRequest) {
  try {
    await authenticateRequest(req);
    const { searchParams } = new URL(req.url);
    const pathway = searchParams.get("pathway") as Pathway | null;

    const components = pathway
      ? getComponentsForPathway(pathway)
      : COMPONENT_DEFINITIONS;

    return Response.json({ data: components });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "Failed to list components");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
