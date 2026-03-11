/**
 * Contextual check-in question generator.
 * Uses Claude Sonnet to produce specific, relevant questions rather than generic "How's it going?"
 */

import Anthropic from "@anthropic-ai/sdk";

interface QuestionContext {
  taskTitle: string;
  taskDescription: string | null;
  taskStatus: string;
  taskPriority: string;
  dueDate: Date | null;
  recentActivity: string[];
  recentComments: string[];
  previousCheckins: Array<{ question: string; response: string | null }>;
  timeRemaining: string | null;
}

const anthropic = new Anthropic();

export async function generateCheckinQuestion(
  context: QuestionContext
): Promise<string> {
  const now = new Date();
  const dueInfo = context.dueDate
    ? `Due: ${context.dueDate.toISOString().split("T")[0]} (${context.timeRemaining ?? "unknown time remaining"})`
    : "No due date set";

  const previousQA = context.previousCheckins
    .slice(-3)
    .map((c) => `Q: ${c.question}\nA: ${c.response ?? "(no response)"}`)
    .join("\n");

  const prompt = `You are a smart project management assistant performing a check-in on a task.

TASK DETAILS:
- Title: ${context.taskTitle}
- Description: ${context.taskDescription ?? "No description"}
- Status: ${context.taskStatus}
- Priority: ${context.taskPriority}
- ${dueInfo}

RECENT ACTIVITY (last 48h):
${context.recentActivity.length > 0 ? context.recentActivity.join("\n") : "No recent activity"}

RECENT COMMENTS:
${context.recentComments.length > 0 ? context.recentComments.slice(-3).join("\n") : "None"}

PREVIOUS CHECK-INS (avoid repeating these questions):
${previousQA || "None yet"}

Current date: ${now.toISOString().split("T")[0]}

Generate ONE specific, contextual check-in question. The question should:
1. Reference specific details from the task context
2. Be actionable — the answer should help update the task status
3. Be different from previous questions
4. Be concise (1-2 sentences max)

Examples of GOOD questions:
- "The API docs task has been in progress for 3 days. Has the backend team shared the v2 spec yet?"
- "This is due tomorrow and still in 'todo'. Are you able to start today or should we adjust the deadline?"

Examples of BAD questions (too generic):
- "How's it going?"
- "Any updates?"

Respond with ONLY the question, no preamble.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text.trim() : "";

  return text || `How is "${context.taskTitle}" progressing? Any blockers?`;
}
