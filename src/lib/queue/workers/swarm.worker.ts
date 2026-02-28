import { Job } from "bullmq";
import { QUEUE_NAMES, getNotificationQueue } from "@/lib/queue";
import { createTypedWorker } from "@/lib/queue/create-typed-worker";
import type { SwarmExecutionJob, NotificationJob } from "@/lib/queue/jobs";
import { executeSwarm } from "@/lib/bees/swarm-executor";
import { updateSwarmSession } from "@/lib/db/queries/swarm-sessions";

// Swarm jobs can run for 15-30 s each; keep concurrency low to avoid
// exhausting DB connections and AI provider rate limits.
const { worker, log } = createTypedWorker<SwarmExecutionJob>(
  "swarm-execution",
  QUEUE_NAMES.SWARM_EXECUTION,
  async (job: Job<SwarmExecutionJob>) => {
    const {
      swarmSessionId,
      userId,
      orgId,
      triggerMessage,
      dispatchPlan,
      verbosity,
      formality,
    } = job.data;

    log.info(
      {
        jobId: job.id,
        swarmSessionId,
        userId,
        beeCount: dispatchPlan.selectedBees.length,
      },
      "Starting swarm execution job"
    );

    try {
      const result = await executeSwarm({
        orgId,
        userId,
        triggerMessage,
        dispatchPlan,
        verbosity,
        formality,
        existingSwarmSessionId: swarmSessionId,
      });

      log.info(
        {
          jobId: job.id,
          swarmSessionId,
          totalTokens: result.totalTokens,
          durationMs: result.totalDurationMs,
        },
        "Swarm execution completed"
      );

      // Notify the user that the swarm finished and their results are ready.
      const notification: NotificationJob = {
        userId,
        orgId,
        type: "pa_action_pending",
        title: "Bee swarm completed",
        body: result.synthesizedResponse.slice(0, 200),
        channel: "in_app",
        metadata: { swarmSessionId },
      };

      await getNotificationQueue().add("swarm-completed", notification);

      return {
        swarmSessionId,
        totalTokens: result.totalTokens,
        durationMs: result.totalDurationMs,
      };
    } catch (error) {
      log.error(
        { jobId: job.id, swarmSessionId, err: error },
        "Swarm execution job failed"
      );

      // The session status is updated inside executeSwarm on error, but if
      // executeSwarm threw before it could do that (e.g. session not found),
      // we set it here as a safety net.
      try {
        await updateSwarmSession(swarmSessionId, {
          status: "failed",
          result: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      } catch (updateErr) {
        log.error(
          { swarmSessionId, err: updateErr },
          "Failed to mark swarm session as failed"
        );
      }

      throw error;
    }
  },
  {
    concurrency: 2,
    // Swarm jobs can run for 15-30 s. Extend the stall-detection lock so BullMQ
    // does not re-queue a job that is still running normally.
    lockDuration: 120_000,
  }
);

export { worker as swarmExecutionWorker };
