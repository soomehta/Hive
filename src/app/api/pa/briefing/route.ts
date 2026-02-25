import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { getOrCreatePaProfile } from "@/lib/db/queries/pa-profiles";
import { getTasks } from "@/lib/db/queries/tasks";
import { getActivityFeed } from "@/lib/db/queries/activity";
import {
  generateBriefing,
  type BriefingContext,
} from "@/lib/ai/briefing-generator";
import { createLogger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";

const log = createLogger("pa-briefing");

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`briefing:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const profile = await getOrCreatePaProfile(auth.userId, auth.orgId);

    const now = new Date();
    const userTimezone = profile.timezone ?? "UTC";

    // Get time in user's timezone for date calculations
    const userNow = new Date(
      now.toLocaleString("en-US", { timeZone: userTimezone })
    );
    const todayStart = new Date(
      userNow.getFullYear(),
      userNow.getMonth(),
      userNow.getDate()
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [myTasksResult, activityResult] = await Promise.all([
      getTasks({
        orgId: auth.orgId,
        assigneeId: auth.userId,
        limit: 100,
      }),
      getActivityFeed({ orgId: auth.orgId, limit: 30 }),
    ]);

    const myTasks = myTasksResult.data;

    // ── Categorize tasks ────────────────────────────────
    const todayTasks = myTasks
      .filter((t) => {
        if (!t.dueDate || t.status === "done" || t.status === "cancelled")
          return false;
        const due = new Date(t.dueDate);
        return due >= todayStart && due < todayEnd;
      })
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate
          ? new Date(t.dueDate).toISOString().split("T")[0]
          : undefined,
      }));

    const weekTasks = myTasks
      .filter((t) => {
        if (!t.dueDate || t.status === "done" || t.status === "cancelled")
          return false;
        const due = new Date(t.dueDate);
        return due >= todayEnd && due < weekEnd;
      })
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate
          ? new Date(t.dueDate).toISOString().split("T")[0]
          : undefined,
      }));

    const overdue = myTasks
      .filter((t) => {
        if (!t.dueDate || t.status === "done" || t.status === "cancelled")
          return false;
        return new Date(t.dueDate) < todayStart;
      })
      .map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: new Date(t.dueDate!).toISOString().split("T")[0],
      }));

    const blockers = myTasks
      .filter((t) => t.isBlocked)
      .map((t) => ({
        id: t.id,
        title: t.title,
        reason: t.blockedReason ?? undefined,
      }));

    // ── Recent activity (last 24h) ──────────────────────
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentActivity = activityResult.data
      .filter((a) => new Date(a.createdAt) >= oneDayAgo)
      .map((a) => ({
        type: a.type,
        description: `${a.type} on ${a.taskId ?? a.projectId ?? "org"}`,
        createdAt: new Date(a.createdAt).toISOString(),
      }));

    // ── Day of week ─────────────────────────────────────
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayOfWeek = days[userNow.getDay()];
    const dateStr = userNow.toISOString().split("T")[0];

    // ── Resolve user display name ───────────────────
    let userName = auth.userId.slice(0, 8);
    let firstName = "there";
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(auth.userId);
      if (data?.user) {
        userName = data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || userName;
        firstName = userName.split(" ")[0] ?? "there";
      }
    } catch { /* best-effort */ }

    // ── Generate AI briefing narrative ───────────────────
    const briefingContext: BriefingContext = {
      userName,
      firstName,
      date: dateStr,
      dayOfWeek,
      timezone: userTimezone,
      todayTasks,
      weekTasks,
      overdueTasks: overdue,
      meetings: [], // Calendar data filled when integrations are active
      recentActivity,
      blockers,
    };

    const briefingResult = await generateBriefing(briefingContext);

    return Response.json({
      briefing: briefingResult.briefing,
      todaysTasks: todayTasks,
      weekTasks,
      overdueTasks: overdue,
      blockers,
      totalActiveTasks: myTasks.filter(
        (t) => t.status !== "done" && t.status !== "cancelled"
      ).length,
      recentActivity,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "PA briefing error");
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
