import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getTask } from "@/lib/db/queries/tasks";
import { getSubtasks } from "@/lib/db/queries/cron-queries";
import { errorResponse } from "@/lib/utils/errors";

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

    const subtasks = await getSubtasks(taskId, auth.orgId);

    return Response.json({ data: subtasks });
  } catch (error) {
    return errorResponse(error);
  }
}
