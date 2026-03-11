import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getTasks } from "@/lib/db/queries/tasks";
import { errorResponse } from "@/lib/utils/errors";
import { isToday, isBefore, startOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    // Fetch user's incomplete tasks
    const result = await getTasks({
      orgId: auth.orgId,
      assigneeId: auth.userId,
      limit: 50,
    });

    const tasks = result.data.filter(
      (t) => t.status !== "done" && t.status !== "cancelled"
    );

    if (tasks.length === 0) {
      return Response.json({
        data: {
          suggestion: "You're all caught up! No pending tasks assigned to you.",
          taskId: null,
        },
      });
    }

    // Priority order: urgent > high > medium > low
    const priorityOrder: Record<string, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    const sortByPriority = (
      a: (typeof tasks)[0],
      b: (typeof tasks)[0]
    ) =>
      (priorityOrder[a.priority ?? ""] ?? 4) -
      (priorityOrder[b.priority ?? ""] ?? 4);

    // Categorize tasks using Date objects from the DB
    const today = startOfDay(new Date());

    const overdue = tasks.filter(
      (t) =>
        t.dueDate instanceof Date &&
        isBefore(t.dueDate, today) &&
        !isToday(t.dueDate)
    );

    const dueToday = tasks.filter(
      (t) => t.dueDate instanceof Date && isToday(t.dueDate)
    );

    const inProgress = tasks.filter((t) => t.status === "in_progress");

    let suggestion: string;
    let taskId: string;

    if (overdue.length > 0) {
      const sorted = [...overdue].sort(sortByPriority);
      const top = sorted[0];
      suggestion =
        overdue.length === 1
          ? `You have 1 overdue task: "${top.title}"`
          : `You have ${overdue.length} overdue tasks. Start with: "${top.title}"`;
      taskId = top.id;
    } else if (dueToday.length > 0) {
      const sorted = [...dueToday].sort(sortByPriority);
      const top = sorted[0];
      suggestion =
        dueToday.length === 1
          ? `1 task due today: "${top.title}"`
          : `${dueToday.length} tasks due today. Focus on: "${top.title}"`;
      taskId = top.id;
    } else if (inProgress.length > 0) {
      const sorted = [...inProgress].sort(sortByPriority);
      const top = sorted[0];
      suggestion = `Continue working on: "${top.title}"`;
      taskId = top.id;
    } else {
      const sorted = [...tasks].sort(sortByPriority);
      const top = sorted[0];
      suggestion = `Next up: "${top.title}" (${top.priority ?? "no"} priority)`;
      taskId = top.id;
    }

    return Response.json({ data: { suggestion, taskId } });
  } catch (error) {
    return errorResponse(error);
  }
}
