import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { searchPages } from "@/lib/db/queries/pages";
import { searchNotices } from "@/lib/db/queries/notices";
import { searchChannelMessages, getChannels } from "@/lib/db/queries/chat";
import { db } from "@/lib/db";
import { tasks, projects } from "@/lib/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";

/**
 * GET /api/search?q=<query>&types=pages,chat,notices,tasks,projects
 * Unified cross-entity search with permission filtering.
 */
export async function GET(req: NextRequest) {
  let auth;
  try {
    auth = await authenticateRequest(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 }
    );
  }

  const typesParam = url.searchParams.get("types") ?? "pages,chat,notices,tasks,projects";
  const types = typesParam.split(",").map((t) => t.trim());
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10"), 50);

  const results: Record<string, unknown[]> = {};

  const promises: Promise<void>[] = [];

  if (types.includes("pages")) {
    promises.push(
      searchPages(auth.orgId, query, limit).then((data) => {
        results.pages = data.map((p) => ({
          type: "page" as const,
          id: p.itemId,
          title: p.title,
          snippet: p.plainText?.slice(0, 200) ?? "",
          updatedAt: p.updatedAt,
        }));
      })
    );
  }

  if (types.includes("notices")) {
    promises.push(
      searchNotices(auth.orgId, query, limit).then((data) => {
        results.notices = data.map((n) => ({
          type: "notice" as const,
          id: n.id,
          title: n.title,
          snippet: n.body?.slice(0, 200) ?? "",
          status: n.status,
          createdAt: n.createdAt,
        }));
      })
    );
  }

  if (types.includes("chat")) {
    promises.push(
      (async () => {
        // Get channels user has access to
        const channels = await getChannels(auth.orgId);
        const channelIds = channels.map((c) => c.id);
        if (channelIds.length === 0) {
          results.chat = [];
          return;
        }
        const messages = await searchChannelMessages(auth.orgId, channelIds, query, limit);
        results.chat = messages.map((m) => ({
          type: "chat_message" as const,
          id: m.id,
          channelId: m.channelId,
          snippet: m.content?.slice(0, 200) ?? "",
          authorId: m.authorId,
          createdAt: m.createdAt,
        }));
      })()
    );
  }

  if (types.includes("tasks")) {
    promises.push(
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          priority: tasks.priority,
          projectId: tasks.projectId,
          updatedAt: tasks.updatedAt,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.orgId, auth.orgId),
            or(
              ilike(tasks.title, `%${query}%`),
              ilike(tasks.description, `%${query}%`)
            )
          )
        )
        .limit(limit)
        .then((data) => {
          results.tasks = data.map((t) => ({
            type: "task" as const,
            id: t.id,
            title: t.title,
            snippet: t.description?.slice(0, 200) ?? "",
            status: t.status,
            priority: t.priority,
            projectId: t.projectId,
            updatedAt: t.updatedAt,
          }));
        })
    );
  }

  if (types.includes("projects")) {
    promises.push(
      db
        .select({
          id: projects.id,
          name: projects.name,
          description: projects.description,
          status: projects.status,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .where(
          and(
            eq(projects.orgId, auth.orgId),
            or(
              ilike(projects.name, `%${query}%`),
              ilike(projects.description, `%${query}%`)
            )
          )
        )
        .limit(limit)
        .then((data) => {
          results.projects = data.map((p) => ({
            type: "project" as const,
            id: p.id,
            title: p.name,
            snippet: p.description?.slice(0, 200) ?? "",
            status: p.status,
            updatedAt: p.updatedAt,
          }));
        })
    );
  }

  await Promise.all(promises);

  return NextResponse.json({ data: results });
}
