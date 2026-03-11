import { chatCompletion } from "@/lib/ai/providers";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { resolveUserMeta } from "@/lib/utils/user-resolver";
import { createLogger } from "@/lib/logger";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

const log = createLogger("extract-tasks");

interface ExtractedTask {
  title: string;
  description?: string;
  assigneeName?: string;
  assigneeId?: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
}

export async function handleExtractTasks(
  action: PAAction
): Promise<ExecutionResult> {
  const { orgId } = action;
  const payload = (action.userEditedPayload ??
    action.plannedPayload) as Record<string, unknown>;

  const notes =
    (payload.notes as string) ?? (payload.content as string) ?? "";

  if (!notes || notes.trim().length < 10) {
    return {
      success: false,
      error: "Meeting notes are too short to extract tasks from.",
    };
  }

  // Get org members for fuzzy name matching
  const members = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.orgId, orgId));

  const memberMetas = await Promise.all(
    members.map(async (m) => {
      const meta = await resolveUserMeta(m.userId);
      return { id: m.userId, name: meta.displayName };
    })
  );

  const memberList = memberMetas
    .map((m) => `- ${m.name} (id: ${m.id})`)
    .join("\n");

  const response = await chatCompletion("planner", {
    messages: [
      {
        role: "system",
        content: `You are a task extraction assistant. Given meeting notes, extract actionable tasks.

## Team Members
${memberList}

## Instructions
- Extract clear, actionable tasks from the notes
- Try to match assignee names to team members listed above
- Set reasonable priorities (low/medium/high/urgent)
- Extract due dates if mentioned (format: YYYY-MM-DD)
- Return a JSON array of tasks

Respond ONLY with a JSON array, no other text:
[{"title": "...", "description": "...", "assigneeName": "...", "assigneeId": "...", "priority": "medium", "dueDate": "2024-03-15"}]`,
      },
      {
        role: "user",
        content: notes,
      },
    ],
    temperature: 0.3,
    maxTokens: 1500,
  });

  try {
    // Parse the response — handle markdown code blocks if present
    let jsonStr = response.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const extractedTasks: ExtractedTask[] = JSON.parse(jsonStr);

    if (!Array.isArray(extractedTasks) || extractedTasks.length === 0) {
      return {
        success: false,
        error: "No actionable tasks found in the notes.",
      };
    }

    // Cap at 20 tasks to avoid runaway responses
    const capped = extractedTasks.slice(0, 20);

    return {
      success: true,
      result: {
        tasks: capped,
        noteLength: notes.length,
        extractedCount: capped.length,
      },
    };
  } catch (err) {
    log.error({ err }, "Failed to parse extracted tasks");
    return {
      success: false,
      error: "Failed to extract tasks from meeting notes. Please try again.",
    };
  }
}
