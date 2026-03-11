import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getTask } from "@/lib/db/queries/tasks";
import { createPageItem } from "@/lib/db/queries/pages";
import { logActivity } from "@/lib/db/queries/activity";
import { createNotification } from "@/lib/notifications/in-app";
import { z } from "zod/v4";
import { errorResponse } from "@/lib/utils/errors";

const fromTaskSchema = z.object({ taskId: z.string().uuid() });

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!hasPermission(auth.memberRole, "page:create")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = fromTaskSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const task = await getTask(parsed.data.taskId);
    if (!task || task.orgId !== auth.orgId) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    const initialContent =
      task.description?.trim() ||
      "";
    const contentJson: Record<string, unknown> = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: initialContent
            ? [{ type: "text", text: initialContent }]
            : [],
        },
      ],
    };

    const { item, page } = await createPageItem({
      orgId: auth.orgId,
      projectId: task.projectId,
      ownerId: auth.userId,
      title: task.title,
      contentJson,
      plainText: initialContent,
      attributes: { sourceTaskId: task.id },
    });

    await logActivity({
      orgId: auth.orgId,
      projectId: task.projectId,
      taskId: task.id,
      userId: auth.userId,
      type: "page_created",
      metadata: { itemId: item.id, pageId: page.id, source: "task", taskTitle: task.title },
    });

    if (task.assigneeId && task.assigneeId !== auth.userId) {
      await createNotification({
        userId: task.assigneeId,
        orgId: auth.orgId,
        type: "page_created",
        title: "Task opened as page",
        body: `A page was created from task "${task.title}".`,
        metadata: { itemId: item.id, taskId: task.id },
      });
    }

    return Response.json(
      { data: { itemId: item.id, pageId: page.id } },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
