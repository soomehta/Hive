import { db } from "@/lib/db";
import { items, itemRelations } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";

export type ItemType =
  | "task"
  | "project"
  | "page"
  | "note"
  | "chat_channel"
  | "announcement";

export type RelationType =
  | "references"
  | "blocks"
  | "derived_from"
  | "parent_of"
  | "related_to";

export async function getItemsByOrg(orgId: string, type?: ItemType) {
  return db
    .select()
    .from(items)
    .where(type ? and(eq(items.orgId, orgId), eq(items.type, type)) : eq(items.orgId, orgId))
    .orderBy(desc(items.updatedAt));
}

export async function getPageItemsByOrg(orgId: string, projectId?: string) {
  const conditions = [eq(items.orgId, orgId), eq(items.type, "page")];
  if (projectId) conditions.push(eq(items.projectId, projectId));
  return db
    .select()
    .from(items)
    .where(and(...conditions))
    .orderBy(desc(items.updatedAt));
}

export async function getPageItemsByUser(orgId: string, userId: string) {
  return db
    .select()
    .from(items)
    .where(
      and(
        eq(items.orgId, orgId),
        eq(items.type, "page"),
        eq(items.ownerId, userId)
      )
    )
    .orderBy(desc(items.updatedAt));
}

export async function getItemById(itemId: string, orgId: string) {
  return db.query.items.findFirst({
    where: and(eq(items.id, itemId), eq(items.orgId, orgId)),
  });
}

export async function createItem(data: {
  orgId: string;
  projectId?: string;
  type: ItemType;
  title: string;
  ownerId: string;
  status?: string;
  sourceId?: string;
  attributes?: Record<string, unknown>;
}) {
  const [created] = await db
    .insert(items)
    .values({
      orgId: data.orgId,
      projectId: data.projectId,
      type: data.type,
      title: data.title,
      ownerId: data.ownerId,
      status: data.status,
      sourceId: data.sourceId,
      attributes: data.attributes ?? {},
    })
    .returning();

  return created;
}

export async function findItemBySourceId(orgId: string, sourceId: string) {
  return db.query.items.findFirst({
    where: and(eq(items.orgId, orgId), eq(items.sourceId, sourceId)),
  });
}

export async function updateItemBySourceId(
  orgId: string,
  sourceId: string,
  data: Partial<{ title: string; status: string | null }>
) {
  const [updated] = await db
    .update(items)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(items.orgId, orgId), eq(items.sourceId, sourceId)))
    .returning();
  return updated;
}

export async function deleteItemBySourceId(orgId: string, sourceId: string) {
  const [deleted] = await db
    .delete(items)
    .where(and(eq(items.orgId, orgId), eq(items.sourceId, sourceId)))
    .returning();
  return deleted;
}

export async function updateItem(
  itemId: string,
  orgId: string,
  data: Partial<{
    title: string;
    status: string | null;
    attributes: Record<string, unknown>;
    projectId: string | null;
  }>
) {
  const [updated] = await db
    .update(items)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(items.id, itemId), eq(items.orgId, orgId)))
    .returning();

  return updated;
}

export async function deleteItem(itemId: string, orgId: string) {
  const [deleted] = await db
    .delete(items)
    .where(and(eq(items.id, itemId), eq(items.orgId, orgId)))
    .returning();

  return deleted;
}

export async function createItemRelation(data: {
  orgId: string;
  fromItemId: string;
  toItemId: string;
  relationType: RelationType;
  createdBy: string;
}) {
  const [created] = await db.insert(itemRelations).values(data).returning();
  return created;
}

export async function deleteItemRelation(relationId: string, orgId: string) {
  const [deleted] = await db
    .delete(itemRelations)
    .where(and(eq(itemRelations.id, relationId), eq(itemRelations.orgId, orgId)))
    .returning();

  return deleted;
}

export async function getItemBacklinks(itemId: string, orgId: string) {
  return db
    .select({
      id: itemRelations.id,
      fromItemId: itemRelations.fromItemId,
      toItemId: itemRelations.toItemId,
      relationType: itemRelations.relationType,
      createdAt: itemRelations.createdAt,
      fromItemTitle: items.title,
      fromItemType: items.type,
    })
    .from(itemRelations)
    .leftJoin(items, eq(itemRelations.fromItemId, items.id))
    .where(and(eq(itemRelations.toItemId, itemId), eq(itemRelations.orgId, orgId)))
    .orderBy(desc(itemRelations.createdAt));
}
