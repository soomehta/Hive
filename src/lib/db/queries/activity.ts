import { db } from "@/lib/db";
import { activityLog } from "@/lib/db/schema";
import { eq, and, desc, lt, sql, or } from "drizzle-orm";

interface LogActivityParams {
  orgId: string;
  projectId?: string | null;
  taskId?: string | null;
  userId: string;
  type: typeof activityLog.$inferInsert.type;
  metadata?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams) {
  const [entry] = await db
    .insert(activityLog)
    .values({
      orgId: params.orgId,
      projectId: params.projectId ?? null,
      taskId: params.taskId ?? null,
      userId: params.userId,
      type: params.type,
      metadata: params.metadata ?? null,
    })
    .returning();

  return entry;
}

interface GetActivityFeedParams {
  orgId: string;
  projectId?: string;
  userId?: string;
  type?: string;
  limit?: number;
  cursor?: string;
}

export async function getActivityFeed(params: GetActivityFeedParams) {
  const {
    orgId,
    projectId,
    userId,
    type,
    limit = 20,
    cursor,
  } = params;

  const conditions = [eq(activityLog.orgId, orgId)];

  if (projectId) {
    conditions.push(eq(activityLog.projectId, projectId));
  }
  if (userId) {
    conditions.push(eq(activityLog.userId, userId));
  }
  if (type) {
    conditions.push(eq(activityLog.type, type as typeof activityLog.$inferInsert.type));
  }
  // Compound cursor: "ISO_TIMESTAMP_ID" for stable pagination
  if (cursor) {
    const sepIndex = cursor.indexOf("_");
    if (sepIndex > 0) {
      const cursorDate = new Date(cursor.slice(0, sepIndex));
      const cursorId = cursor.slice(sepIndex + 1);
      if (!isNaN(cursorDate.getTime())) {
        conditions.push(
          or(
            sql`${activityLog.createdAt} < ${cursorDate}`,
            and(sql`${activityLog.createdAt} = ${cursorDate}`, sql`${activityLog.id} < ${cursorId}`)
          )!
        );
      }
    } else {
      // Backwards-compatible: plain UUID cursor (legacy)
      conditions.push(lt(activityLog.id, cursor));
    }
  }

  const entries = await db
    .select()
    .from(activityLog)
    .where(and(...conditions))
    .orderBy(desc(activityLog.createdAt), desc(activityLog.id))
    .limit(limit + 1);

  const hasMore = entries.length > limit;
  const data = hasMore ? entries.slice(0, limit) : entries;
  const lastItem = data[data.length - 1];

  return {
    data,
    nextCursor: hasMore && lastItem
      ? `${lastItem.createdAt.toISOString()}_${lastItem.id}`
      : null,
    hasMore,
  };
}
