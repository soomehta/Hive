import { db } from "@/lib/db";
import { notices } from "@/lib/db/schema";
import { and, desc, eq, isNull, ilike, or } from "drizzle-orm";

export type NoticeStatus = "active" | "scheduled" | "expired" | "archived";

export async function getNotices(orgId: string, projectId?: string) {
  return db
    .select()
    .from(notices)
    .where(
      projectId
        ? and(eq(notices.orgId, orgId), eq(notices.projectId, projectId))
        : and(eq(notices.orgId, orgId), isNull(notices.projectId))
    )
    .orderBy(desc(notices.isPinned), desc(notices.createdAt));
}

export async function getNoticeById(orgId: string, noticeId: string) {
  return db.query.notices.findFirst({
    where: and(eq(notices.orgId, orgId), eq(notices.id, noticeId)),
  });
}

export async function createNotice(data: {
  orgId: string;
  projectId?: string;
  authorId: string;
  title: string;
  body: string;
  status?: NoticeStatus;
  isPinned?: boolean;
  startsAt?: Date;
  expiresAt?: Date;
}) {
  const [created] = await db
    .insert(notices)
    .values({
      orgId: data.orgId,
      projectId: data.projectId,
      authorId: data.authorId,
      title: data.title,
      body: data.body,
      status: data.status ?? "active",
      isPinned: data.isPinned ?? false,
      startsAt: data.startsAt,
      expiresAt: data.expiresAt,
    })
    .returning();

  return created;
}

export async function updateNotice(
  noticeId: string,
  orgId: string,
  data: Partial<{
    title: string;
    body: string;
    status: NoticeStatus;
    isPinned: boolean;
    startsAt: Date | null;
    expiresAt: Date | null;
  }>
) {
  const [updated] = await db
    .update(notices)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(notices.id, noticeId), eq(notices.orgId, orgId)))
    .returning();

  return updated;
}

export async function searchNotices(orgId: string, query: string, limit = 20) {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(notices)
    .where(
      and(
        eq(notices.orgId, orgId),
        or(ilike(notices.title, pattern), ilike(notices.body, pattern))
      )
    )
    .orderBy(desc(notices.createdAt))
    .limit(limit);
}

export async function deleteNotice(noticeId: string, orgId: string) {
  const [deleted] = await db
    .delete(notices)
    .where(and(eq(notices.id, noticeId), eq(notices.orgId, orgId)))
    .returning();

  return deleted;
}
