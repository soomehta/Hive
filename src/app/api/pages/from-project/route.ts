import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getProject } from "@/lib/db/queries/projects";
import { createPageItem } from "@/lib/db/queries/pages";
import { logActivity } from "@/lib/db/queries/activity";
import { z } from "zod/v4";
import { errorResponse } from "@/lib/utils/errors";

const fromProjectSchema = z.object({ projectId: z.string().uuid() });

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!hasPermission(auth.memberRole, "page:create")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = fromProjectSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const project = await getProject(parsed.data.projectId);
    if (!project || project.orgId !== auth.orgId) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const description = project.description?.trim() ?? "";
    const contentJson: Record<string, unknown> = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: description
            ? [{ type: "text", text: description }]
            : [],
        },
      ],
    };

    const { item, page } = await createPageItem({
      orgId: auth.orgId,
      projectId: project.id,
      ownerId: auth.userId,
      title: project.name,
      contentJson,
      plainText: description,
      attributes: { sourceProjectId: project.id },
    });

    await logActivity({
      orgId: auth.orgId,
      projectId: project.id,
      userId: auth.userId,
      type: "page_created",
      metadata: { itemId: item.id, pageId: page.id, source: "project", projectName: project.name },
    });

    return Response.json(
      { data: { itemId: item.id, pageId: page.id } },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
