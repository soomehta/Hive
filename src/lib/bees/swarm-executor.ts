import {
  createSwarmSession,
  updateSwarmSession,
  createBeeRun,
} from "@/lib/db/queries/swarm-sessions";
import { getBeeInstance } from "@/lib/db/queries/bee-instances";
import { logActivity } from "@/lib/db/queries/activity";
import { executeBeeRun } from "./bee-runner";
import { createHandover } from "./handover";
import { hasHoldSignal } from "./signals";
import { getContextSnapshot } from "./context";
import { buildSynthesisPrompt } from "@/lib/ai/prompts/bee-system-prompts";
import { getRoleConfig } from "@/lib/ai/providers/config";
import { getChatProvider } from "@/lib/ai/providers";
import { createLogger } from "@/lib/logger";
import type { DispatchPlan, DispatchBee } from "@/types/bees";

const log = createLogger("swarm-executor");

interface SwarmInput {
  orgId: string;
  userId: string;
  conversationId?: string;
  triggerMessage: string;
  dispatchPlan: DispatchPlan;
  verbosity: string;
  formality: string;
}

interface SwarmResult {
  swarmSessionId: string;
  synthesizedResponse: string;
  totalTokens: number;
  totalDurationMs: number;
}

export async function executeSwarm(input: SwarmInput): Promise<SwarmResult> {
  const startTime = Date.now();
  let totalTokens = 0;

  // Create swarm session
  const session = await createSwarmSession({
    orgId: input.orgId,
    userId: input.userId,
    conversationId: input.conversationId,
    triggerMessage: input.triggerMessage,
    dispatchPlan: input.dispatchPlan,
  });

  try {
    // Log swarm started
    await logActivity({
      orgId: input.orgId,
      userId: input.userId,
      type: "bee_swarm_started",
      metadata: {
        swarmSessionId: session.id,
        beeCount: input.dispatchPlan.selectedBees.length,
        triggerMessage: input.triggerMessage.slice(0, 200),
      },
    });

    // Update status to running
    await updateSwarmSession(session.id, { status: "running" });

    // Create all bee runs
    const beeRuns: Array<{
      runId: string;
      bee: DispatchBee;
    }> = [];

    for (const bee of input.dispatchPlan.selectedBees) {
      const run = await createBeeRun({
        swarmSessionId: session.id,
        beeInstanceId: bee.beeInstanceId,
        order: bee.order,
      });
      beeRuns.push({ runId: run.id, bee });
    }

    // Group runs by order (phase)
    const phases = new Map<number, typeof beeRuns>();
    for (const run of beeRuns) {
      const phase = phases.get(run.bee.order) ?? [];
      phase.push(run);
      phases.set(run.bee.order, phase);
    }

    // Execute phase by phase
    const sortedPhases = [...phases.entries()].sort(([a], [b]) => a - b);
    let previousPhaseRunIds: string[] = [];

    for (const [, phaseRuns] of sortedPhases) {
      // Check for hold signals before each phase
      if (await hasHoldSignal(session.id)) {
        await updateSwarmSession(session.id, { status: "paused" });
        // Return partial result — the swarm can be resumed later
        return {
          swarmSessionId: session.id,
          synthesizedResponse:
            "The bee swarm has been paused due to a hold signal. Please review and resolve the signal to continue.",
          totalTokens,
          totalDurationMs: Date.now() - startTime,
        };
      }

      // Execute all bees in this phase in parallel
      const results = await Promise.allSettled(
        phaseRuns.map(async (phaseRun) => {
          const instanceData = await getBeeInstance(phaseRun.bee.beeInstanceId);
          if (!instanceData) {
            throw new Error(
              `Bee instance ${phaseRun.bee.beeInstanceId} not found`
            );
          }

          const result = await executeBeeRun({
            runId: phaseRun.runId,
            swarmSessionId: session.id,
            orgId: input.orgId,
            userId: input.userId,
            triggerMessage: input.triggerMessage,
            template: instanceData.template,
            instance: instanceData.instance,
          });

          totalTokens += result.tokensUsed;

          // Create handovers to next phase
          if (previousPhaseRunIds.length > 0 && result.output.handoverData) {
            for (const prevRunId of previousPhaseRunIds) {
              await createHandover({
                swarmSessionId: session.id,
                fromBeeRunId: prevRunId,
                toBeeRunId: phaseRun.runId,
                handoverType: "sequential",
                summary: result.output.summary,
                data: result.output.handoverData as Record<string, unknown>,
              });
            }

            // Log handover activity
            await logActivity({
              orgId: input.orgId,
              userId: input.userId,
              type: "bee_handover",
              metadata: {
                swarmSessionId: session.id,
                fromBeeRunId: previousPhaseRunIds[0],
                toBeeRunId: phaseRun.runId,
                summary: result.output.summary,
              },
            });
          }

          return result;
        })
      );

      // Check for failures
      const failures = results.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected"
      );
      if (failures.length > 0) {
        log.warn(
          { failures: failures.map((f) => f.reason?.message) },
          "Some bee runs failed"
        );
      }

      previousPhaseRunIds = phaseRuns.map((r) => r.runId);
    }

    // Synthesize results
    const contextSnapshot = await getContextSnapshot(session.id);
    const allOutputs = beeRuns
      .filter((r) => r.bee.type !== "assistant")
      .map((r) => ({
        beeName: r.bee.templateName,
        beeType: r.bee.type,
        summary: "",
        result: contextSnapshot[`${r.bee.type}:${r.bee.templateName}:output`],
      }))
      .filter((o) => o.result !== undefined);

    let synthesizedResponse: string;

    if (allOutputs.length > 0) {
      const synthesisPrompt = buildSynthesisPrompt({
        triggerMessage: input.triggerMessage,
        allOutputs,
        verbosity: input.verbosity,
        formality: input.formality,
      });

      const config = getRoleConfig("bee-runner");
      const provider = getChatProvider("bee-runner");

      const aiResult = await provider.chat({
        model: config.model,
        messages: [{ role: "user", content: synthesisPrompt }],
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      synthesizedResponse = aiResult.content;
      totalTokens += aiResult.usage?.totalTokens ?? 0;
    } else {
      synthesizedResponse =
        "The bee swarm completed but produced no actionable results.";
    }

    // Mark completed
    await updateSwarmSession(session.id, {
      status: "completed",
      result: {
        synthesizedResponse,
        totalTokens,
        beeCount: beeRuns.length,
      },
    });

    // Log swarm completed
    await logActivity({
      orgId: input.orgId,
      userId: input.userId,
      type: "bee_swarm_completed",
      metadata: {
        swarmSessionId: session.id,
        totalTokens,
        beeCount: beeRuns.length,
        durationMs: Date.now() - startTime,
      },
    });

    return {
      swarmSessionId: session.id,
      synthesizedResponse,
      totalTokens,
      totalDurationMs: Date.now() - startTime,
    };
  } catch (error) {
    log.error({ err: error, sessionId: session.id }, "Swarm execution failed");

    await updateSwarmSession(session.id, {
      status: "failed",
      result: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error;
  }
}
