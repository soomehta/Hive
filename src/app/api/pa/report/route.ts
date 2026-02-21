import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { getOrCreatePaProfile } from "@/lib/db/queries/pa-profiles";
import { getTasks } from "@/lib/db/queries/tasks";
import { getActivityFeed } from "@/lib/db/queries/activity";
import { generateReport, type ReportData } from "@/lib/ai/report-generator";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`report:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await req.json();

    const {
      question,
      projectId,
      format = "narrative",
    } = body as {
      question: string;
      projectId?: string;
      format?: "narrative" | "structured" | "data_only";
    };

    if (!question || typeof question !== "string") {
      return Response.json(
        { error: "question is required" },
        { status: 400 }
      );
    }

    // Fetch all tasks for the org (or filtered by project)
    const taskFilters: {
      orgId: string;
      projectId?: string;
      limit: number;
    } = {
      orgId: auth.orgId,
      limit: 500,
    };
    if (projectId) {
      taskFilters.projectId = projectId;
    }

    const [allTasksResult, activityResult, paProfile] = await Promise.all([
      getTasks(taskFilters),
      getActivityFeed({ orgId: auth.orgId, limit: 50 }),
      getOrCreatePaProfile(auth.userId, auth.orgId),
    ]);

    const allTasks = allTasksResult.data;
    const now = new Date();

    // ── tasksByStatus ────────────────────────────────────
    const tasksByStatus: Record<string, number> = {};
    for (const t of allTasks) {
      tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
    }

    // ── tasksByAssignee ──────────────────────────────────
    const tasksByAssignee: Record<string, number> = {};
    for (const t of allTasks) {
      const key = t.assigneeId ?? "unassigned";
      tasksByAssignee[key] = (tasksByAssignee[key] ?? 0) + 1;
    }

    // ── tasksByPriority ──────────────────────────────────
    const tasksByPriority: Record<string, number> = {};
    for (const t of allTasks) {
      tasksByPriority[t.priority] = (tasksByPriority[t.priority] ?? 0) + 1;
    }

    // ── completionRate ───────────────────────────────────
    const doneCount = allTasks.filter(
      (t) => t.status === "done" || t.status === "cancelled"
    ).length;
    const completionRate =
      allTasks.length > 0 ? Math.round((doneCount / allTasks.length) * 100) : 0;

    // ── overdueTasks ─────────────────────────────────────
    const overdueTasks = allTasks
      .filter((t) => {
        if (!t.dueDate || t.status === "done" || t.status === "cancelled")
          return false;
        return new Date(t.dueDate) < now;
      })
      .map((t) => ({
        id: t.id,
        title: t.title,
        assignee: t.assigneeId ?? undefined,
        dueDate: new Date(t.dueDate!).toISOString().split("T")[0],
      }));

    // ── blockers ─────────────────────────────────────────
    const blockers = allTasks
      .filter((t) => t.isBlocked)
      .map((t) => ({
        id: t.id,
        title: t.title,
        assignee: t.assigneeId ?? undefined,
      }));

    // ── velocity (trailing 4 weeks) ──────────────────────
    const velocity: number[] = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(
        now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000
      );
      const weekEnd = new Date(
        now.getTime() - w * 7 * 24 * 60 * 60 * 1000
      );
      const count = allTasks.filter((t) => {
        if (!t.completedAt) return false;
        const completed = new Date(t.completedAt);
        return completed >= weekStart && completed < weekEnd;
      }).length;
      velocity.push(count);
    }

    // ── upcomingDeadlines (next 7 days) ──────────────────
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = allTasks
      .filter((t) => {
        if (!t.dueDate || t.status === "done" || t.status === "cancelled")
          return false;
        const due = new Date(t.dueDate);
        return due >= now && due <= nextWeek;
      })
      .sort(
        (a, b) =>
          new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      )
      .map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: new Date(t.dueDate!).toISOString().split("T")[0],
      }));

    // ── workloadByPerson ─────────────────────────────────
    const workloadByPerson: Record<string, number> = {};
    for (const t of allTasks) {
      if (
        t.assigneeId &&
        t.status !== "done" &&
        t.status !== "cancelled"
      ) {
        workloadByPerson[t.assigneeId] =
          (workloadByPerson[t.assigneeId] ?? 0) + 1;
      }
    }

    // ── recentActivity ───────────────────────────────────
    const recentActivity = activityResult.data.map((a) => ({
      type: a.type,
      description: `${a.type} on ${a.taskId ?? a.projectId ?? "org"}`,
      createdAt: new Date(a.createdAt).toISOString(),
    }));

    // ── Build report data ────────────────────────────────
    const reportData: ReportData = {
      tasksByStatus,
      tasksByAssignee,
      tasksByPriority,
      completionRate,
      overdueTasks,
      blockers,
      velocity,
      upcomingDeadlines,
      workloadByPerson,
      recentActivity,
    };

    // ── Data-only mode ───────────────────────────────────
    if (format === "data_only") {
      return Response.json({
        narrative: null,
        data: reportData,
        generatedAt: new Date().toISOString(),
      });
    }

    // ── Generate narrative via Claude ────────────────────
    const result = await generateReport(question, reportData, {
      role: paProfile.autonomyMode ?? "copilot",
      name: auth.userId,
      date: now.toISOString().split("T")[0],
    });

    return Response.json({
      narrative: result.narrative,
      data: format === "structured" ? reportData : undefined,
      generatedAt: result.generatedAt,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("PA report error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
