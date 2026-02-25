import { assessComplexity } from "./complexity";
import { getActiveBeeInstancesForSwarm } from "@/lib/db/queries/bee-instances";
import type {
  DispatchPlan,
  DispatchBee,
  TriggerConditions,
} from "@/types/bees";
import { createLogger } from "@/lib/logger";

const log = createLogger("bee-dispatcher");

const SWARM_THRESHOLD = 30;
const MAX_BEES_PER_SWARM = 6;

interface DispatchInput {
  message: string;
  intent: string;
  entities: Record<string, unknown>;
  orgId: string;
  projectId?: string;
}

export async function dispatch(input: DispatchInput): Promise<DispatchPlan> {
  // Get all active bee instances
  const instances = await getActiveBeeInstancesForSwarm(
    input.orgId,
    input.projectId
  );

  // Assess complexity using heuristics
  const complexity = assessComplexity({
    message: input.message,
    intent: input.intent,
    entities: input.entities,
    activeBeeTemplates: instances.map((i) => ({
      name: i.template.name,
      type: i.template.type,
      subtype: i.template.subtype,
      triggerConditions: i.template.triggerConditions,
    })),
  });

  log.info(
    { score: complexity.score, reasons: complexity.reasons },
    "Complexity assessment"
  );

  // Direct mode for simple requests
  if (complexity.score < SWARM_THRESHOLD) {
    return {
      mode: "direct",
      complexityScore: complexity.score,
      complexityReasons: complexity.reasons,
      selectedBees: [],
      estimatedDurationMs: 0,
    };
  }

  // Swarm mode — select and order bees
  const selectedBees = selectBees(input, instances);

  return {
    mode: "swarm",
    complexityScore: complexity.score,
    complexityReasons: complexity.reasons,
    selectedBees,
    estimatedDurationMs: estimateDuration(selectedBees),
  };
}

function selectBees(
  input: DispatchInput,
  instances: Array<{
    instance: { id: string; name: string };
    template: {
      name: string;
      type: string;
      subtype: string;
      triggerConditions: unknown;
    };
  }>
): DispatchBee[] {
  const scored: DispatchBee[] = [];

  for (const { instance, template } of instances) {
    const relevance = scoreRelevance(input, template);

    if (relevance > 0.3) {
      scored.push({
        beeInstanceId: instance.id,
        templateName: template.name,
        type: template.type as any,
        subtype: template.subtype as any,
        order: determineOrder(template),
        relevanceScore: relevance,
        reason: `Matched with relevance ${relevance.toFixed(2)}`,
      });
    }
  }

  // Sort by order, then relevance
  scored.sort((a, b) => a.order - b.order || b.relevanceScore - a.relevanceScore);

  // Cap total bees to prevent runaway cost
  if (scored.length > MAX_BEES_PER_SWARM) {
    scored.splice(MAX_BEES_PER_SWARM);
  }

  // Ensure assistant bee is last for synthesis
  const assistantIdx = scored.findIndex((b) => b.type === "assistant");
  if (assistantIdx >= 0) {
    const assistant = scored.splice(assistantIdx, 1)[0];
    const maxOrder = scored.reduce((max, b) => Math.max(max, b.order), 0);
    assistant.order = maxOrder + 1;
    scored.push(assistant);
  }

  return scored;
}

function scoreRelevance(
  input: DispatchInput,
  template: {
    type: string;
    subtype: string;
    triggerConditions: unknown;
  }
): number {
  let score = 0;
  const conditions = template.triggerConditions as TriggerConditions | null;
  const lowerMessage = input.message.toLowerCase();

  // Intent match
  if (conditions?.intents?.includes(input.intent)) {
    score += 0.4;
  }

  // Keyword match
  if (conditions?.keywords) {
    const matches = conditions.keywords.filter((kw) =>
      lowerMessage.includes(kw.toLowerCase())
    );
    if (matches.length > 0) {
      score += Math.min(0.4, matches.length * 0.15);
    }
  }

  // Subtype relevance
  if (template.subtype === "analyst" && lowerMessage.match(/analyze|report|metrics|data/)) {
    score += 0.2;
  }
  if (template.subtype === "compliance" && lowerMessage.match(/compliance|audit|policy|security/)) {
    score += 0.2;
  }
  if (template.subtype === "coordinator" && lowerMessage.match(/coordinate|schedule|organize|plan/)) {
    score += 0.2;
  }

  // Assistant bee always gets some relevance (for synthesis)
  if (template.type === "assistant") {
    score = Math.max(score, 0.5);
  }

  return Math.min(1.0, score);
}

function determineOrder(template: { type: string; subtype: string }): number {
  // Analyst and compliance first (parallel)
  if (template.subtype === "analyst") return 0;
  if (template.subtype === "compliance") return 0;

  // Coordinator next
  if (template.subtype === "coordinator") return 1;

  // Specialist
  if (template.subtype === "specialist") return 2;

  // Orchestrator
  if (template.subtype === "orchestrator") return 1;

  // Admin bee
  if (template.type === "admin") return 2;

  // Manager
  if (template.type === "manager") return 1;

  // Operator
  if (template.type === "operator") return 2;

  // Assistant (synthesis) — always last
  if (template.type === "assistant") return 99;

  return 3;
}

function estimateDuration(bees: DispatchBee[]): number {
  if (bees.length === 0) return 0;

  // Group by order (phases)
  const phases = new Map<number, number>();
  for (const bee of bees) {
    const count = phases.get(bee.order) ?? 0;
    phases.set(bee.order, count + 1);
  }

  // Each phase takes ~3s (parallel bees within a phase don't add time)
  return phases.size * 3000;
}
