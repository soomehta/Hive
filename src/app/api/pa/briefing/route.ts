import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { getOrCreatePaProfile } from "@/lib/db/queries/pa-profiles";
import {
  generateBriefing,
  type BriefingContext,
} from "@/lib/ai/briefing-generator";
import { errorResponse } from "@/lib/utils/errors";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { aggregateBriefingData } from "@/lib/data/briefing-data";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`briefing:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const profile = await getOrCreatePaProfile(auth.userId, auth.orgId);

    const userTimezone = profile.timezone ?? "UTC";

    // ── Aggregate data via shared function ──────────────
    const {
      todayTasks,
      weekTasks,
      overdueTasks: overdue,
      blockers,
      recentActivity,
      totalActiveTasks,
    } = await aggregateBriefingData(auth.userId, auth.orgId, userTimezone);

    // ── Day of week (computed in user's local timezone) ─
    const now = new Date();
    const userNow = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
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
      totalActiveTasks,
      recentActivity,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
