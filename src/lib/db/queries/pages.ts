import { db } from "@/lib/db";
import { pages, pageRevisions, items } from "@/lib/db/schema";
import { and, desc, eq, ilike, sql } from "drizzle-orm";

export async function getPageByItemId(itemId: string, orgId: string) {
  return db.query.pages.findFirst({
    where: and(eq(pages.itemId, itemId), eq(pages.orgId, orgId)),
  });
}

export async function createPage(data: {
  orgId: string;
  itemId: string;
  lastEditedBy: string;
  contentJson: Record<string, unknown>;
  plainText?: string;
  icon?: string;
  coverUrl?: string;
  editorVersion?: string;
}) {
  const [created] = await db
    .insert(pages)
    .values({
      orgId: data.orgId,
      itemId: data.itemId,
      lastEditedBy: data.lastEditedBy,
      contentJson: data.contentJson,
      plainText: data.plainText ?? "",
      icon: data.icon,
      coverUrl: data.coverUrl,
      editorVersion: data.editorVersion ?? "v1",
    })
    .returning();

  return created;
}

export async function updatePageByItemId(
  itemId: string,
  orgId: string,
  data: Partial<{
    contentJson: Record<string, unknown>;
    plainText: string;
    icon: string | null;
    coverUrl: string | null;
    lastEditedBy: string;
  }>
) {
  const [updated] = await db
    .update(pages)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(pages.itemId, itemId), eq(pages.orgId, orgId)))
    .returning();

  return updated;
}

export async function createPageRevision(data: {
  orgId: string;
  pageId: string;
  createdBy: string;
  contentJson: Record<string, unknown>;
  plainText?: string;
}) {
  const [created] = await db
    .insert(pageRevisions)
    .values({
      orgId: data.orgId,
      pageId: data.pageId,
      createdBy: data.createdBy,
      contentJson: data.contentJson,
      plainText: data.plainText ?? "",
    })
    .returning();

  return created;
}

export async function getPageRevisions(pageId: string, orgId: string) {
  return db
    .select()
    .from(pageRevisions)
    .where(and(eq(pageRevisions.pageId, pageId), eq(pageRevisions.orgId, orgId)))
    .orderBy(desc(pageRevisions.createdAt));
}

export async function getPageRevisionById(revisionId: string, orgId: string) {
  return db.query.pageRevisions.findFirst({
    where: and(eq(pageRevisions.id, revisionId), eq(pageRevisions.orgId, orgId)),
  });
}

export async function searchPages(orgId: string, query: string, limit = 20) {
  return db
    .select({
      itemId: pages.itemId,
      title: items.title,
      plainText: pages.plainText,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .innerJoin(items, eq(pages.itemId, items.id))
    .where(
      and(
        eq(pages.orgId, orgId),
        sql`to_tsvector('english', ${pages.plainText}) @@ plainto_tsquery('english', ${query})`
      )
    )
    .orderBy(desc(pages.updatedAt))
    .limit(limit);
}

export async function createPageItem(data: {
  orgId: string;
  projectId?: string;
  ownerId: string;
  title: string;
  contentJson?: Record<string, unknown>;
  plainText?: string;
  attributes?: Record<string, unknown>;
}) {
  return db.transaction(async (tx) => {
    const [item] = await tx
      .insert(items)
      .values({
        orgId: data.orgId,
        projectId: data.projectId,
        type: "page",
        title: data.title,
        ownerId: data.ownerId,
        attributes: data.attributes ?? {},
      })
      .returning();

    const [page] = await tx
      .insert(pages)
      .values({
        orgId: data.orgId,
        itemId: item.id,
        lastEditedBy: data.ownerId,
        contentJson: data.contentJson ?? { type: "doc", content: [] },
        plainText: data.plainText ?? "",
        editorVersion: "v1",
      })
      .returning();

    return { item, page };
  });
}
