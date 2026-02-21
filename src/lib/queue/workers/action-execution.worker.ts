import { Job } from "bullmq";
import {
  createWorker,
  QUEUE_NAMES,
  getNotificationQueue,
  getLearningQueue,
} from "@/lib/queue";
import type {
  ActionExecutionJob,
  NotificationJob,
  LearningJob,
} from "@/lib/queue/jobs";
import { executeAction } from "@/lib/actions/executor";
import { getPaAction, updatePaAction } from "@/lib/db/queries/pa-actions";
import { logActivity } from "@/lib/db/queries/activity";
import type { PAAction } from "@/types/pa";
import { createLogger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

const log = createLogger("action-execution");

const worker = createWorker<ActionExecutionJob>(
  QUEUE_NAMES.ACTION_EXECUTION,
  async (job: Job<ActionExecutionJob>) => {
    const { actionId, userId, orgId } = job.data;

    log.info(
      { jobId: job.id, actionId, userId },
      "Processing action execution"
    );

    // 1. Fetch the action record
    const action = await getPaAction(actionId);
    if (!action) {
      throw new Error(`PA action not found: ${actionId}`);
    }

    // 2. Verify the action is in an executable state
    if (action.status !== "pending" && action.status !== "approved") {
      log.info(
        { actionId, status: action.status },
        "Skipping action: not in executable state"
      );
      return { skipped: true, reason: `Action status is ${action.status}` };
    }

    // 3. Execute the action via the handler registry
    const result = await executeAction(action as PAAction);

    if (result.success) {
      // 4a. Mark action as executed
      await updatePaAction(actionId, {
        status: "executed",
        executedPayload: action.plannedPayload as Record<string, any>,
        executionResult: result.result ?? {},
        executedAt: new Date(),
      });

      // 5. Log to activity feed
      await logActivity({
        orgId,
        userId,
        type: "pa_action_executed",
        metadata: {
          actionId,
          actionType: action.actionType,
          tier: action.tier,
          result: result.result,
        },
      });

      // 6. Send notification to user about the executed action
      const notificationJob: NotificationJob = {
        userId,
        orgId,
        type: "pa_action_pending",
        title: `PA executed: ${action.actionType.replace(/_/g, " ")}`,
        body:
          (action.plannedPayload as Record<string, any>)?.confirmationMessage ??
          `Action ${action.actionType} completed successfully.`,
        channel: "in_app",
        metadata: { actionId, actionType: action.actionType },
      };

      await getNotificationQueue().add("action-executed", notificationJob);

      // 7. Enqueue learning job for profile updates
      const learningJob: LearningJob = {
        userId,
        orgId,
        intent: action.actionType,
        actionType: action.actionType,
        wasApproved: action.status === "approved",
        wasEdited: !!action.userEditedPayload,
      };

      await getLearningQueue().add("learn-from-action", learningJob);

      log.info({ actionId }, "Action executed successfully");

      return { success: true, actionId, result: result.result };
    } else {
      // 4b. Mark action as failed
      await updatePaAction(actionId, {
        status: "failed",
        executionResult: { error: result.error },
      });

      log.error({ actionId, error: result.error }, "Action execution failed");

      return { success: false, actionId, error: result.error };
    }
  },
  {
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  log.info({ jobId: job.id }, "Job completed successfully");
});

worker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, err }, "Job failed");
  Sentry.captureException(err);
});

export { worker as actionExecutionWorker };
