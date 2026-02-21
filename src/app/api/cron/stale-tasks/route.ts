import { NextRequest } from "next/server";
import { createLogger } from "@/lib/logger";
import { db } from "@/lib/db";
import { tasks, notifications } from "@/lib/db/schema";
import { and, lt, eq, gte, desc } from "drizzle-orm";
import { createNotification } from "@/lib/notifications/in-app";
import { verifyCronSecret } from "@/lib/auth/cron-auth";

const log = createLogger("stale-tasks");

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    );
    // Deduplication window: do not re-notify about the same stale task within 7 days
    const dedupeWindowStart = sevenDaysAgo;

    // ── Find stale tasks: in_progress and not updated in 7+ days ──
    const staleTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.status, "in_progress"),
          lt(tasks.updatedAt, sevenDaysAgo)
        )
      );

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const task of staleTasks) {
      try {
        // ── Skip if no assignee ──────────────────────────
        if (!task.assigneeId) {
          skipped++;
          continue;
        }

        // ── Deduplication: skip if already notified in last 7 days ──
        const recentNudge = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, task.assigneeId),
              eq(notifications.type, "pa_nudge"),
              gte(notifications.createdAt, dedupeWindowStart)
            )
          )
          .orderBy(desc(notifications.createdAt))
          .limit(10);

        const alreadyNudged = recentNudge.some((n) => {
          const meta = n.metadata as Record<string, unknown> | null;
          return meta?.taskId === task.id && meta?.nudgeType === "stale";
        });

        if (alreadyNudged) {
          skipped++;
          continue;
        }

        // ── Calculate days since last update ─────────────
        const updatedAt = new Date(task.updatedAt);
        const diffMs = now.getTime() - updatedAt.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        // ── Send notification ────────────────────────────
        await createNotification({
          userId: task.assigneeId,
          orgId: task.orgId,
          type: "pa_nudge",
          title: `Stale task: "${task.title}"`,
          body: `"${task.title}" hasn't been updated in ${diffDays} days. Is it still in progress?`,
          metadata: {
            taskId: task.id,
            projectId: task.projectId,
            lastUpdated: updatedAt.toISOString(),
            daysSinceUpdate: diffDays,
            nudgeType: "stale",
          },
        });

        sent++;
      } catch (taskError) {
        const message =
          taskError instanceof Error ? taskError.message : "Unknown error";
        errors.push(`Task ${task.id}: ${message}`);
      }
    }

    return Response.json({
      success: true,
      sent,
      skipped,
      total: staleTasks.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    log.error({ err: error }, "Stale tasks cron error");
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
