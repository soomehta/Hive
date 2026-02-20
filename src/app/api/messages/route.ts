import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { createMessageSchema } from "@/lib/utils/validation";
import { getMessages, createMessage } from "@/lib/db/queries/messages";
import { getProject } from "@/lib/db/queries/projects";
import { logActivity } from "@/lib/db/queries/activity";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) {
      return Response.json(
        { error: "Missing required query parameter: projectId" },
        { status: 400 }
      );
    }

    // Verify project belongs to the authenticated org
    const project = await getProject(projectId);
    if (!project || project.orgId !== auth.orgId) {
      return Response.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const messageList = await getMessages(projectId);

    return Response.json({ data: messageList });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/messages error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    const body = await req.json();
    const parsed = createMessageSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify project belongs to the authenticated org
    const project = await getProject(parsed.data.projectId);
    if (!project || project.orgId !== auth.orgId) {
      return Response.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const message = await createMessage({
      projectId: parsed.data.projectId,
      orgId: auth.orgId,
      userId: auth.userId,
      title: parsed.data.title,
      content: parsed.data.content,
    });

    await logActivity({
      orgId: auth.orgId,
      projectId: message.projectId,
      userId: auth.userId,
      type: "message_posted",
      metadata: { projectName: project.name, messageTitle: message.title },
    });

    return Response.json({ data: message }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("POST /api/messages error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
