import { updateBeeRun } from "@/lib/db/queries/swarm-sessions";
import { writeContext, getContextSnapshot } from "./context";
import { createSignal } from "./signals";
import { logActivity } from "@/lib/db/queries/activity";
import { buildBeeRunPrompt } from "@/lib/ai/prompts/bee-system-prompts";
import { getRoleConfig } from "@/lib/ai/providers/config";
import { getChatProvider } from "@/lib/ai/providers";
import { createLogger } from "@/lib/logger";
import type { BeeTemplate, BeeInstance } from "@/types/bees";

const log = createLogger("bee-runner");

interface BeeRunInput {
  runId: string;
  swarmSessionId: string;
  orgId: string;
  userId: string;
  triggerMessage: string;
  template: BeeTemplate;
  instance: BeeInstance;
  handoverData?: unknown;
}

interface BeeRunOutput {
  summary: string;
  result: unknown;
  handoverData?: unknown;
  signals?: Array<{
    type: "info" | "warning" | "hold" | "escalate";
    message: string;
  }>;
}

export async function executeBeeRun(input: BeeRunInput): Promise<{
  output: BeeRunOutput;
  tokensUsed: number;
  durationMs: number;
}> {
  const startTime = Date.now();

  // Mark as running
  await updateBeeRun(input.runId, {
    status: "running",
    statusText: `${input.instance.name} is processing...`,
  });

  try {
    // Build context snapshot
    const contextSnapshot = await getContextSnapshot(input.swarmSessionId);

    // Build prompt
    const prompt = buildBeeRunPrompt({
      systemPrompt: input.template.systemPrompt,
      triggerMessage: input.triggerMessage,
      contextSnapshot,
      handoverData: input.handoverData,
      beeType: input.template.type,
      beeName: input.instance.name,
    });

    // Get AI config for bee runner role
    const config = getRoleConfig("bee-runner");
    const provider = getChatProvider("bee-runner");

    const aiResult = await provider.chat({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    });

    const durationMs = Date.now() - startTime;
    const tokensUsed = aiResult.usage?.totalTokens ?? 0;

    // Parse output
    let output: BeeRunOutput;
    try {
      const cleaned = aiResult.content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      output = JSON.parse(cleaned);
    } catch {
      output = {
        summary: aiResult.content.slice(0, 200),
        result: aiResult.content,
      };
    }

    // Write output to hive context
    await writeContext({
      swarmSessionId: input.swarmSessionId,
      beeRunId: input.runId,
      key: `${input.template.type}:${input.instance.name}:output`,
      value: output.result,
      contextType: "output",
    });

    // Write handover data if present
    if (output.handoverData) {
      await writeContext({
        swarmSessionId: input.swarmSessionId,
        beeRunId: input.runId,
        key: `${input.template.type}:${input.instance.name}:handover`,
        value: output.handoverData,
        contextType: "handover",
      });
    }

    // Process signals
    if (output.signals && output.signals.length > 0) {
      for (const sig of output.signals) {
        await createSignal({
          swarmSessionId: input.swarmSessionId,
          fromBeeRunId: input.runId,
          signalType: sig.type,
          message: sig.message,
        });

        // Log signal activity
        await logActivity({
          orgId: input.orgId,
          userId: input.userId,
          type: "bee_signal",
          metadata: {
            swarmSessionId: input.swarmSessionId,
            beeRunId: input.runId,
            signalType: sig.type,
            message: sig.message,
          },
        });
      }
    }

    // Mark completed
    await updateBeeRun(input.runId, {
      status: "completed",
      output: output as any,
      statusText: output.summary,
      tokensUsed,
      durationMs,
    });

    return { output, tokensUsed, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    log.error({ err: error, runId: input.runId }, "Bee run failed");

    await updateBeeRun(input.runId, {
      status: "failed",
      statusText: error instanceof Error ? error.message : "Unknown error",
      durationMs,
    });

    throw error;
  }
}
