import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, projects } from "@/lib/db/schema";
import { getEmbeddingQueue } from "@/lib/queue";
import type { EmbeddingJob } from "@/lib/queue/jobs";

async function backfill() {
  console.log("Starting embedding backfill...");

  const queue = getEmbeddingQueue();
  let enqueued = 0;

  // ── Tasks ──────────────────────────────────────────────
  const allTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      orgId: tasks.orgId,
    })
    .from(tasks);

  console.log(`Found ${allTasks.length} tasks to embed`);

  for (const task of allTasks) {
    const content = `${task.title} ${task.description ?? ""}`.trim();
    if (!content) continue;

    const job: EmbeddingJob = {
      orgId: task.orgId,
      sourceType: "task",
      sourceId: task.id,
      content,
    };

    await queue.add("embed", job, {
      jobId: `embed:task:${task.id}`,
    });
    enqueued++;

    // Rate limit: pause 1 s every 50 jobs
    if (enqueued % 50 === 0) {
      console.log(`Enqueued ${enqueued}/${allTasks.length} tasks...`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // ── Projects ───────────────────────────────────────────
  const allProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      orgId: projects.orgId,
    })
    .from(projects);

  console.log(`Found ${allProjects.length} projects to embed`);

  for (const project of allProjects) {
    const content = `${project.name} ${project.description ?? ""}`.trim();
    if (!content) continue;

    const job: EmbeddingJob = {
      orgId: project.orgId,
      sourceType: "project",
      sourceId: project.id,
      content,
    };

    await queue.add("embed", job, {
      jobId: `embed:project:${project.id}`,
    });
    enqueued++;
  }

  // ── Pages (optional — graceful skip if table absent) ──
  try {
    const { items } = await import("@/lib/db/schema");
    const allPages = await db
      .select({
        id: items.id,
        title: items.title,
        orgId: items.orgId,
      })
      .from(items)
      .where(eq(items.type, "page"));

    console.log(`Found ${allPages.length} pages to embed`);

    for (const page of allPages) {
      const content = page.title?.trim();
      if (!content) continue;

      const job: EmbeddingJob = {
        orgId: page.orgId,
        sourceType: "page",
        sourceId: page.id,
        content,
      };

      await queue.add("embed", job, {
        jobId: `embed:page:${page.id}`,
      });
      enqueued++;
    }
  } catch {
    console.log("Skipping pages backfill (table may not exist or type column missing)");
  }

  console.log(`Backfill complete! Enqueued ${enqueued} embedding jobs.`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
