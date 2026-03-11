import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getDefaultPinboardLayout } from "@/lib/db/queries/pinboard";
import { getUserTasks, getTasks } from "@/lib/db/queries/tasks";
import { getNotices } from "@/lib/db/queries/notices";
import { getChannels, getUnreadCounts } from "@/lib/db/queries/chat";
import { getProjects } from "@/lib/db/queries/projects";
import { getActivityFeed } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    const now = new Date();
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [layout, tasks, notices, channels, projects, recentActivityResult, upcomingResult, blockedResult] =
      await Promise.all([
        getDefaultPinboardLayout(auth.orgId, auth.userId),
        getUserTasks(auth.userId, auth.orgId),
        getNotices(auth.orgId),
        getChannels(auth.orgId),
        getProjects(auth.orgId),
        getActivityFeed({ orgId: auth.orgId, limit: 20 }),
        // Tasks with due dates in next 7 days
        getTasks({
          orgId: auth.orgId,
          assigneeId: auth.userId,
          sort: "due_date",
          order: "asc",
          limit: 10,
        }),
        // Blocked tasks
        getTasks({
          orgId: auth.orgId,
          isBlocked: true,
          limit: 10,
        }),
      ]);

    const recentActivity = recentActivityResult.data;
    const upcomingTasks = upcomingResult.data;
    const blockedTasks = blockedResult.data;

    // Filter upcoming deadlines: tasks with due_date within 7 days
    const deadlines = upcomingTasks.filter((t: any) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      return due >= now && due <= sevenDaysOut && t.status !== "done";
    });

    // Extract recent mentions of the current user from activity
    const mentions = recentActivity.filter(
      (a: any) =>
        a.metadata?.mentionedUserId === auth.userId ||
        a.metadata?.assigneeId === auth.userId,
    );

    // Project pulse: for each project, count tasks by status + blockers
    const projectPulse = projects.slice(0, 5).map((p: any) => ({
      id: p.id,
      name: p.name,
      blockerCount: blockedTasks.filter((t: any) => t.projectId === p.id).length,
    }));

    // Unread message counts per channel
    const unreadCounts = await getUnreadCounts(auth.orgId, auth.userId);

    return Response.json({
      data: {
        layout,
        cards: {
          myTasks: tasks.slice(0, 10),
          notices: notices.slice(0, 10),
          channels: channels.slice(0, 10).map((ch: any) => ({
            ...ch,
            unreadCount: unreadCounts[ch.id] ?? 0,
          })),
          deadlines: deadlines.slice(0, 10),
          mentions: mentions.slice(0, 10),
          projectPulse,
          paBriefing: null, // Fetched separately by the PA briefing card
        },
        unreadCounts,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
