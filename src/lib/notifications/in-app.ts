import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc, inArray, count } from "drizzle-orm";
import { sseManager } from "./sse";

interface CreateNotificationParams {
  userId: string;
  orgId: string;
  type: typeof notifications.$inferInsert.type;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: params.userId,
      orgId: params.orgId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      metadata: params.metadata ?? null,
    })
    .returning();

  // Push via SSE
  sseManager.sendToUser(params.userId, params.orgId, "notification", notification);

  return notification;
}

export async function getNotifications(
  userId: string,
  orgId: string,
  limit: number = 20
) {
  return db
    .select()
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.orgId, orgId))
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationsRead(notificationIds: string[], userId: string, orgId: string) {
  if (notificationIds.length === 0) return;

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        inArray(notifications.id, notificationIds),
        eq(notifications.userId, userId),
        eq(notifications.orgId, orgId)
      )
    );
}

export async function getUnreadCount(userId: string, orgId: string) {
  const [result] = await db
    .select({ total: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.orgId, orgId),
        eq(notifications.isRead, false)
      )
    );

  return result?.total ?? 0;
}
