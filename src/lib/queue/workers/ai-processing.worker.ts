import { Job } from "bullmq";
import { createWorker, QUEUE_NAMES, getActionExecutionQueue } from "@/lib/queue";
import type { AIProcessingJob, ActionExecutionJob } from "@/lib/queue/jobs";
import { classifyIntent } from "@/lib/ai/intent-classifier";
import { planAction } from "@/lib/ai/action-planner";
import { getOrCreatePaProfile } from "@/lib/db/queries/pa-profiles";
import { createPaAction } from "@/lib/db/queries/pa-actions";
import { resolveActionTier } from "@/lib/actions/registry";
import { db } from "@/lib/db";
import { projects, tasks, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Builds the classification context required by classifyIntent.
 * Fetches user projects, team members, and recent tasks for the org.
 */
async function buildClassificationContext(userId: string, orgId: string) {
  // Fetch org projects
  const orgProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.orgId, orgId))
    .limit(20);

  // Fetch team members (just user IDs — Clerk resolves names on the frontend)
  const members = await db
    .select({
      id: organizationMembers.userId,
      name: organizationMembers.userId,
    })
    .from(organizationMembers)
    .where(eq(organizationMembers.orgId, orgId))
    .limit(50);

  // Fetch recent tasks assigned to the user
  const recentTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
    })
    .from(tasks)
    .where(and(eq(tasks.orgId, orgId), eq(tasks.assigneeId, userId)))
    .orderBy(desc(tasks.createdAt))
    .limit(10);

  return {
    userName: userId, // Clerk user ID; display name resolved on frontend
    projects: orgProjects,
    teamMembers: members,
    recentTasks: recentTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
    })),
  };
}

const worker = createWorker<AIProcessingJob>(
  QUEUE_NAMES.AI_PROCESSING,
  async (job: Job<AIProcessingJob>) => {
    const { transcript, userId, orgId, voiceTranscriptId } = job.data;

    console.log(
      `[ai-processing] Processing job ${job.id} for user=${userId} org=${orgId}`
    );

    // 1. Get or create the user's PA profile
    const profile = await getOrCreatePaProfile(userId, orgId);

    // 2. Build context for intent classification
    const classificationCtx = await buildClassificationContext(userId, orgId);

    // 3. Classify the intent using GPT-4o-mini
    const classification = await classifyIntent(transcript, classificationCtx);

    console.log(
      `[ai-processing] Intent: ${classification.intent} (confidence=${classification.confidence.toFixed(2)})`
    );

    // 4. Plan the action using Claude Sonnet
    const plan = await planAction(classification.intent, classification.entities, {
      userName: classificationCtx.userName,
      autonomyMode: profile.autonomyMode,
      verbosity: profile.verbosity,
      formality: profile.formality,
    });

    // 4b. Resolve tier using profile overrides and autonomy mode
    const resolvedTier = resolveActionTier(classification.intent, profile, {
      assigneeId: (plan.payload as Record<string, any>).assigneeId,
      userId,
    });

    console.log(
      `[ai-processing] Planned action: tier=${resolvedTier} (plan.tier=${plan.tier}), payload keys=${Object.keys(plan.payload).join(", ")}`
    );

    // 5. Create the PA action record
    const action = await createPaAction({
      userId,
      orgId,
      actionType: classification.intent,
      tier: resolvedTier,
      plannedPayload: {
        ...plan.payload,
        confirmationMessage: plan.confirmationMessage,
        draftPreview: plan.draftPreview,
        voiceTranscriptId,
      },
    });

    // 6. If the tier is auto_execute, enqueue the action for immediate execution
    if (resolvedTier === "auto_execute") {
      const executionJob: ActionExecutionJob = {
        actionId: action.id,
        userId,
        orgId,
      };

      await getActionExecutionQueue().add("execute-action", executionJob, {
        priority: 1,
      });

      console.log(
        `[ai-processing] Auto-execute tier: enqueued action ${action.id} for execution`
      );
    }

    console.log(
      `[ai-processing] Completed job ${job.id}, action=${action.id} tier=${resolvedTier}`
    );

    return {
      actionId: action.id,
      intent: classification.intent,
      tier: resolvedTier,
    };
  },
  {
    concurrency: 3,
  }
);

worker.on("completed", (job) => {
  console.log(`[ai-processing] Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(
    `[ai-processing] Job ${job?.id} failed: ${err.message}`,
    err.stack
  );
});

export { worker as aiProcessingWorker };
