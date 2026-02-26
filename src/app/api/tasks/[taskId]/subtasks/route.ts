import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { getTask } from "@/lib/db/queries/tasks";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const log = createLogger("task-subtasks");

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { taskId } = await params;

    // Verify parent task belongs to org
    const task = await getTask(taskId);
    if (!task || task.orgId !== auth.orgId) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    const subtasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.parentTaskId, taskId), eq(tasks.orgId, auth.orgId)));

    return Response.json({ data: subtasks });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "GET /api/tasks/[taskId]/subtasks error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
