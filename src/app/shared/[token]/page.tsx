import { db } from "@/lib/db";
import { projectGuests, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getTasks } from "@/lib/db/queries/tasks";
import { notFound } from "next/navigation";

interface SharedPageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedProjectPage({ params }: SharedPageProps) {
  const { token } = await params;

  // Validate token
  const [guest] = await db
    .select()
    .from(projectGuests)
    .where(eq(projectGuests.token, token))
    .limit(1);

  if (!guest) {
    notFound();
  }

  // Check expiration
  if (guest.expiresAt && new Date(guest.expiresAt) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Link Expired</h1>
          <p className="mt-2 text-muted-foreground">
            This shared link has expired. Please request a new one.
          </p>
        </div>
      </div>
    );
  }

  // Fetch project
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, guest.projectId))
    .limit(1);

  if (!project) {
    notFound();
  }

  // Fetch tasks
  const result = await getTasks({
    orgId: guest.orgId,
    projectId: guest.projectId,
    limit: 100,
  });
  const projectTasks = result.data;

  const statusCounts = {
    todo: projectTasks.filter((t) => t.status === "todo").length,
    in_progress: projectTasks.filter((t) => t.status === "in_progress").length,
    done: projectTasks.filter((t) => t.status === "done").length,
  };
  const total = projectTasks.length;
  const progress =
    total > 0 ? Math.round((statusCounts.done / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Shared Project View</span>
            <span className="capitalize">({guest.role})</span>
          </div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="mt-2 text-muted-foreground">{project.description}</p>
          )}
        </div>

        {/* Progress */}
        <div className="mb-8 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span>To do: {statusCounts.todo}</span>
            <span>In progress: {statusCounts.in_progress}</span>
            <span>Done: {statusCounts.done}</span>
          </div>
        </div>

        {/* Tasks */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold mb-3">Tasks ({total})</h2>
          {projectTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <div
                className={`size-2 rounded-full shrink-0 ${
                  task.status === "done"
                    ? "bg-green-500"
                    : task.status === "in_progress"
                      ? "bg-blue-500"
                      : "bg-gray-300"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    task.status === "done"
                      ? "line-through text-muted-foreground"
                      : ""
                  }`}
                >
                  {task.title}
                </p>
              </div>
              <span className="text-xs capitalize text-muted-foreground">
                {task.status.replace(/_/g, " ")}
              </span>
              <span className="text-xs capitalize text-muted-foreground">
                {task.priority}
              </span>
            </div>
          ))}
          {total === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No tasks have been added to this project yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
