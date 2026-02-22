import type { TriggerConditions } from "@/types/bees";

interface ComplexityInput {
  message: string;
  intent: string;
  entities: Record<string, unknown>;
  activeBeeTemplates: Array<{
    name: string;
    type: string;
    subtype: string;
    triggerConditions: unknown;
  }>;
}

interface ComplexityResult {
  score: number;
  reasons: string[];
}

const MULTI_STEP_KEYWORDS = [
  "then",
  "after that",
  "based on",
  "once done",
  "next",
  "followed by",
  "and then",
  "also",
  "finally",
  "first",
  "second",
  "third",
];

const COMPLIANCE_KEYWORDS = [
  "compliance",
  "audit",
  "regulation",
  "policy",
  "security",
  "privacy",
  "gdpr",
  "hipaa",
];

const ANALYSIS_KEYWORDS = [
  "analyze",
  "analysis",
  "compare",
  "benchmark",
  "trend",
  "insight",
  "pattern",
  "metrics",
  "statistics",
  "report",
];

const COORDINATION_KEYWORDS = [
  "coordinate",
  "schedule",
  "arrange",
  "organize",
  "plan",
  "across teams",
  "all projects",
  "everyone",
  "team-wide",
];

export function assessComplexity(input: ComplexityInput): ComplexityResult {
  const { message, entities, activeBeeTemplates } = input;
  const lowerMessage = message.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  // Entity count check
  const entityValues = Object.values(entities).filter(
    (v) => v !== null && v !== undefined
  );
  if (entityValues.length > 3) {
    score += 20;
    reasons.push(`Multiple entities referenced (${entityValues.length})`);
  }

  // Cross-project references
  const projectRefs = Array.isArray(entities.projectIds)
    ? entities.projectIds.length
    : entities.projectId
    ? 1
    : 0;
  if (projectRefs > 1) {
    score += 25;
    reasons.push(`Cross-project references (${projectRefs} projects)`);
  }

  // Multi-step keywords
  const multiStepMatches = MULTI_STEP_KEYWORDS.filter((kw) =>
    lowerMessage.includes(kw)
  );
  if (multiStepMatches.length > 0) {
    score += Math.min(20, multiStepMatches.length * 10);
    reasons.push(
      `Multi-step keywords: ${multiStepMatches.join(", ")}`
    );
  }

  // Domain triggers
  const complianceMatches = COMPLIANCE_KEYWORDS.filter((kw) =>
    lowerMessage.includes(kw)
  );
  if (complianceMatches.length > 0) {
    score += 15;
    reasons.push(`Compliance domain detected`);
  }

  const analysisMatches = ANALYSIS_KEYWORDS.filter((kw) =>
    lowerMessage.includes(kw)
  );
  if (analysisMatches.length > 0) {
    score += 15;
    reasons.push(`Analysis domain detected`);
  }

  const coordinationMatches = COORDINATION_KEYWORDS.filter((kw) =>
    lowerMessage.includes(kw)
  );
  if (coordinationMatches.length > 0) {
    score += 15;
    reasons.push(`Coordination domain detected`);
  }

  // Bee template trigger matching
  for (const template of activeBeeTemplates) {
    const conditions = template.triggerConditions as TriggerConditions | null;
    if (!conditions) continue;

    const keywordMatch = conditions.keywords?.some((kw) =>
      lowerMessage.includes(kw.toLowerCase())
    );
    const intentMatch = conditions.intents?.includes(input.intent);

    if (keywordMatch || intentMatch) {
      score += 10;
      reasons.push(`Bee template match: ${template.name}`);
    }
  }

  return {
    score: Math.min(100, score),
    reasons,
  };
}
