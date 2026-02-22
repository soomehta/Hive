export function buildBeeRunPrompt(params: {
  systemPrompt: string;
  triggerMessage: string;
  contextSnapshot: Record<string, unknown>;
  handoverData?: unknown;
  beeType: string;
  beeName: string;
}): string {
  const contextSection =
    Object.keys(params.contextSnapshot).length > 0
      ? `\n\n## Shared Context from Previous Bees\n${JSON.stringify(params.contextSnapshot, null, 2)}`
      : "";

  const handoverSection = params.handoverData
    ? `\n\n## Handover from Previous Bee\n${JSON.stringify(params.handoverData, null, 2)}`
    : "";

  return `${params.systemPrompt}

## Current Task
User request: "${params.triggerMessage}"
${contextSection}${handoverSection}

## Instructions
Process this request according to your role as ${params.beeName} (${params.beeType}).
Return your output as a JSON object with the following structure:
{
  "summary": "Brief description of what you did",
  "result": <your work product>,
  "handoverData": <data for the next bee, if applicable>,
  "signals": [{ "type": "info|warning|hold|escalate", "message": "..." }]
}`;
}

export function buildSynthesisPrompt(params: {
  triggerMessage: string;
  allOutputs: Array<{
    beeName: string;
    beeType: string;
    summary: string;
    result: unknown;
  }>;
  verbosity: string;
  formality: string;
}): string {
  const outputsSection = params.allOutputs
    .map(
      (o) =>
        `### ${o.beeName} (${o.beeType})\n**Summary:** ${o.summary}\n**Result:** ${JSON.stringify(o.result, null, 2)}`
    )
    .join("\n\n");

  return `You are the Assistant Bee synthesizing results from a swarm of specialized bees.

## Original User Request
"${params.triggerMessage}"

## Bee Outputs
${outputsSection}

## Instructions
Synthesize these outputs into a single, coherent response for the user.
Style: ${params.verbosity}, ${params.formality}.
Focus on actionable information and clear next steps.
Return plain text (not JSON) — this will be shown directly to the user.`;
}
