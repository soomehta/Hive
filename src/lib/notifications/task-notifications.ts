import { createNotification } from "./in-app";

/**
 * Notify a user when they are assigned a task (if assigned to someone other than the actor).
 */
export async function notifyOnTaskAssignment(params: {
  assigneeId: string;
  actorUserId: string;
  orgId: string;
  taskId: string;
  projectId: string;
  taskTitle: string;
  body?: string;
}) {
  if (!params.assigneeId || params.assigneeId === params.actorUserId) return;

  await createNotification({
    userId: params.assigneeId,
    orgId: params.orgId,
    type: "task_assigned",
    title: `You were assigned "${params.taskTitle}"`,
    body: params.body,
    metadata: { taskId: params.taskId, projectId: params.projectId },
  });
}

/**
 * Notify the task creator when their task is completed (if completed by someone else).
 */
export async function notifyOnTaskCompletion(params: {
  creatorUserId: string;
  actorUserId: string;
  orgId: string;
  taskId: string;
  projectId: string;
  taskTitle: string;
}) {
  if (params.creatorUserId === params.actorUserId) return;

  await createNotification({
    userId: params.creatorUserId,
    orgId: params.orgId,
    type: "task_completed",
    title: `"${params.taskTitle}" was completed`,
    metadata: { taskId: params.taskId, projectId: params.projectId },
  });
}
