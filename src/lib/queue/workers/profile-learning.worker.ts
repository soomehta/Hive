import { Job } from "bullmq";
import { createWorker, QUEUE_NAMES } from "@/lib/queue";
import type { LearningJob } from "@/lib/queue/jobs";
import {
  getPaProfile,
  updatePaProfile,
  incrementInteractions,
} from "@/lib/db/queries/pa-profiles";

/**
 * Profile learning worker.
 *
 * Tracks patterns in how the user interacts with PA actions:
 * - Which intents are most common
 * - Approval vs rejection rates per action type
 * - Whether the user edits payloads (indicating the PA's defaults are wrong)
 *
 * Over time, these signals can drive:
 * - Tier overrides (promote actions to auto_execute if always approved)
 * - Tier demotions (move to draft_approve if often edited)
 * - Surfacing frequently-used intents in quick-action UI
 */
const worker = createWorker<LearningJob>(
  QUEUE_NAMES.LEARNING,
  async (job: Job<LearningJob>) => {
    const { userId, orgId, intent, actionType, wasApproved, wasEdited } =
      job.data;

    console.log(
      `[profile-learning] Processing job ${job.id}: user=${userId} intent=${intent} approved=${wasApproved} edited=${wasEdited}`
    );

    // 1. Increment the total interaction count and common intent counter
    await incrementInteractions(userId, orgId, intent);

    // 2. Fetch current profile for learning adjustments
    const profile = await getPaProfile(userId, orgId);
    if (!profile) {
      console.log(
        `[profile-learning] No profile found for user=${userId} org=${orgId}, skipping`
      );
      return { skipped: true, reason: "No PA profile found" };
    }

    // 3. Update action-specific learning data
    const actionOverrides =
      (profile.actionOverrides as Record<string, any>) ?? {};
    const learningData = actionOverrides._learning ?? {};

    // Initialize per-action tracking if needed
    if (!learningData[actionType]) {
      learningData[actionType] = {
        totalExecutions: 0,
        approvedCount: 0,
        rejectedCount: 0,
        editedCount: 0,
        lastUsed: null,
      };
    }

    const actionStats = learningData[actionType];
    actionStats.totalExecutions += 1;
    actionStats.lastUsed = new Date().toISOString();

    if (wasApproved) {
      actionStats.approvedCount += 1;
    } else {
      actionStats.rejectedCount += 1;
    }

    if (wasEdited) {
      actionStats.editedCount += 1;
    }

    // 4. Compute tier recommendations based on approval patterns
    const totalForAction = actionStats.totalExecutions;
    const approvalRate =
      totalForAction > 0 ? actionStats.approvedCount / totalForAction : 0;
    const editRate =
      totalForAction > 0 ? actionStats.editedCount / totalForAction : 0;

    // After sufficient data (10+ executions), suggest tier adjustments
    if (totalForAction >= 10) {
      if (approvalRate >= 0.95 && editRate < 0.05) {
        // User almost always approves without edits -> suggest auto_execute
        actionStats.suggestedTier = "auto_execute";
      } else if (approvalRate >= 0.8 && editRate < 0.2) {
        // High approval, low edits -> suggest execute_notify
        actionStats.suggestedTier = "execute_notify";
      } else if (editRate >= 0.5) {
        // User frequently edits -> keep at draft_approve
        actionStats.suggestedTier = "draft_approve";
      } else if (approvalRate < 0.5) {
        // Low approval rate -> suggest_only
        actionStats.suggestedTier = "suggest_only";
      }
    }

    // 5. Track common blockers pattern from intent data
    const commonBlockers =
      (profile.commonBlockers as string[]) ?? [];

    // 6. Save updated learning data back to the profile
    const updatedOverrides = {
      ...actionOverrides,
      _learning: learningData,
    };

    await updatePaProfile(userId, orgId, {
      actionOverrides: updatedOverrides,
    });

    console.log(
      `[profile-learning] Completed job ${job.id}: ` +
        `action=${actionType} total=${totalForAction} ` +
        `approvalRate=${(approvalRate * 100).toFixed(0)}% ` +
        `editRate=${(editRate * 100).toFixed(0)}%` +
        (actionStats.suggestedTier
          ? ` suggestedTier=${actionStats.suggestedTier}`
          : "")
    );

    return {
      userId,
      actionType,
      totalExecutions: totalForAction,
      approvalRate,
      editRate,
      suggestedTier: actionStats.suggestedTier ?? null,
    };
  },
  {
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`[profile-learning] Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(
    `[profile-learning] Job ${job?.id} failed: ${err.message}`,
    err.stack
  );
});

export { worker as profileLearningWorker };
