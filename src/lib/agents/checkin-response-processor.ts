/**
 * Processes user responses to check-in questions.
 * Extracts status, blockers, and progress estimates, then takes appropriate actions.
 */

import { db } from "@/lib/db";
import { agentCheckins, tasks, taskComments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createNotification } from "@/lib/notifications/in-app";
import { logActivity } from "@/lib/db/queries/activity";
import OpenAI from "openai";

const openai = new OpenAI();

interface ProcessedResponse {
  status: "on_track" | "at_risk" | "blocked";
  blockers: string[];
  progressEstimate: number | null; // 0-100
  summary: string;
}

/**
 * Parse a user's check-in response using GPT-4o-mini for extraction.
 */
export async function parseCheckinResponse(
  question: string,
  response: string,
  taskTitle: string
): Promise<ProcessedResponse> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You extract structured data from a task check-in response.
Return JSON with:
- status: "on_track" | "at_risk" | "blocked"
- blockers: string[] (empty if none)
- progressEstimate: number 0-100 or null if unclear
- summary: one-sentence summary of the response`,
      },
      {
        role: "user",
        content: `Task: ${taskTitle}\nQuestion: ${question}\nResponse: ${response}`,
      },
    ],
  });

  try {
    const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
    return {
      status: ["on_track", "at_risk", "blocked"].includes(parsed.status)
        ? parsed.status
        : "on_track",
      blockers: Array.isArray(parsed.blockers) ? parsed.blockers : [],
      progressEstimate:
        typeof parsed.progressEstimate === "number"
          ? parsed.progressEstimate
          : null,
      summary: parsed.summary ?? response.slice(0, 200),
    };
  } catch {
    return {
      status: "on_track",
      blockers: [],
      progressEstimate: null,
      summary: response.slice(0, 200),
    };
  }
}

/**
 * Process a check-in response: update the checkin record, flag task if needed,
 * add task comment, and notify relevant people.
 */
export async function processCheckinResponse(params: {
  checkinId: string;
  orgId: string;
  response: string;
  taskId: string;
  taskTitle: string;
  question: string;
  assigneeUserId: string;
  taskCreatedBy?: string;
}) {
  const parsed = await parseCheckinResponse(
    params.question,
    params.response,
    params.taskTitle
  );

  // Update the checkin record
  await db
    .update(agentCheckins)
    .set({
      response: params.response,
      responseMetadata: parsed,
      status: "answered",
      respondedAt: new Date(),
    })
    .where(eq(agentCheckins.id, params.checkinId));

  // Add as task comment
  await db.insert(taskComments).values({
    taskId: params.taskId,
    userId: params.assigneeUserId,
    content: `[Check-in update] ${parsed.summary}`,
  });

  // If at_risk or blocked: flag the task and notify
  if (parsed.status === "blocked" || parsed.status === "at_risk") {
    await db
      .update(tasks)
      .set({
        isBlocked: parsed.status === "blocked",
        blockedReason:
          parsed.status === "blocked"
            ? parsed.blockers.join("; ")
            : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, params.taskId), eq(tasks.orgId, params.orgId)));

    // Notify task creator / project lead
    if (params.taskCreatedBy && params.taskCreatedBy !== params.assigneeUserId) {
      await createNotification({
        userId: params.taskCreatedBy,
        orgId: params.orgId,
        type: "blocker_flagged",
        title: `"${params.taskTitle}" is ${parsed.status === "blocked" ? "blocked" : "at risk"}`,
        metadata: {
          taskId: params.taskId,
          checkinId: params.checkinId,
          status: parsed.status,
          blockers: parsed.blockers,
        },
      });
    }

    await logActivity({
      orgId: params.orgId,
      taskId: params.taskId,
      userId: params.assigneeUserId,
      type: "agent_checkin_responded",
      metadata: { checkinId: params.checkinId, status: parsed.status },
    });
  }

  return parsed;
}
