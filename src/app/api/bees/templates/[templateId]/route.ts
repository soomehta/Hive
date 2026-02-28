import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getBeeTemplate,
  updateBeeTemplate,
  deleteBeeTemplate,
} from "@/lib/db/queries/bee-templates";
import { errorResponse } from "@/lib/utils/errors";
import { z } from "zod";

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  systemPrompt: z.string().min(1).optional(),
  subtype: z
    .enum(["none", "orchestrator", "coordinator", "specialist", "analyst", "compliance"])
    .optional(),
  toolAccess: z.array(z.string()).optional(),
  defaultAutonomyTier: z
    .enum(["auto_execute", "execute_notify", "draft_approve", "suggest_only"])
    .optional(),
  triggerConditions: z
    .object({
      intents: z.array(z.string()).optional(),
      keywords: z.array(z.string()).optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ templateId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { templateId } = await params;

    const template = await getBeeTemplate(templateId);
    if (!template || template.orgId !== auth.orgId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return Response.json(template);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);

    if (!hasPermission(auth.memberRole, "org:manage")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { templateId } = await params;
    const template = await getBeeTemplate(templateId);
    if (!template || template.orgId !== auth.orgId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateBeeTemplate(templateId, parsed.data);
    return Response.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);

    if (!hasPermission(auth.memberRole, "org:manage")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { templateId } = await params;
    const template = await getBeeTemplate(templateId);
    if (!template || template.orgId !== auth.orgId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    if (template.isSystem) {
      return Response.json(
        { error: "Cannot delete system bee templates" },
        { status: 400 }
      );
    }

    await deleteBeeTemplate(templateId);
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
