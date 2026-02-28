import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getComponentsForPathway, COMPONENT_DEFINITIONS } from "@/lib/dashboard/component-registry";
import type { Pathway } from "@/types/bees";
import { errorResponse } from "@/lib/utils/errors";

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
    return errorResponse(error);
  }
}
