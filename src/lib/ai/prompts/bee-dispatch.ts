export function buildDispatchPrompt(params: {
  message: string;
  intent: string;
  entities: Record<string, unknown>;
  availableBees: Array<{
    instanceId: string;
    name: string;
    type: string;
    subtype: string;
    triggerKeywords: string[];
    triggerIntents: string[];
  }>;
}): string {
  const beeList = params.availableBees
    .map(
      (b) =>
        `- ${b.name} (${b.type}/${b.subtype}): keywords=[${b.triggerKeywords.join(",")}], intents=[${b.triggerIntents.join(",")}]`
    )
    .join("\n");

  return `Given the user request and available bees, select which bees should handle this request and in what order.

## User Request
"${params.message}"

## Classified Intent
${params.intent}

## Entities
${JSON.stringify(params.entities, null, 2)}

## Available Bees
${beeList}

## Selection Rules
1. Analyst bees gather data first (order 0)
2. Compliance bees run in parallel as watchers (order 0)
3. Specialist/Coordinator bees process next (order 1+)
4. Assistant Bee always synthesizes at the end (highest order)
5. Same-type operators at the same order = parallel execution

Return a JSON array of selected bees with their execution order.`;
}
