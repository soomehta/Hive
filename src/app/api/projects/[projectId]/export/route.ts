import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getProject } from "@/lib/db/queries/projects";
import { getTasks } from "@/lib/db/queries/tasks";
import { errorResponse } from "@/lib/utils/errors";
import { format } from "date-fns";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { projectId } = await params;

    const project = await getProject(projectId);
    if (!project || project.orgId !== auth.orgId) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const result = await getTasks({ orgId: auth.orgId, projectId, limit: 1000 });
    const tasks = result.data;

    // Build CSV
    const headers = ["Title", "Status", "Priority", "Assignee", "Due Date", "Created", "Updated"];

    const escapeCSV = (value: string | null | undefined): string => {
      if (!value) return "";
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const rows = tasks.map((task) => [
      escapeCSV(task.title),
      escapeCSV(task.status),
      escapeCSV(task.priority),
      escapeCSV(task.assigneeId ?? "Unassigned"),
      task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
      task.createdAt ? format(new Date(task.createdAt), "yyyy-MM-dd") : "",
      task.updatedAt ? format(new Date(task.updatedAt), "yyyy-MM-dd") : "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const safeName = project.name
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .replace(/\s+/g, "-");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}-tasks.csv"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
