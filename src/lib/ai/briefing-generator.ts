import { chatCompletion } from "./providers";
import { getBriefingPrompt } from "./prompts/briefing";

export interface BriefingContext {
  userName: string;
  firstName: string;
  date: string;
  dayOfWeek: string;
  timezone: string;
  todayTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
    projectName?: string;
  }>;
  weekTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
    projectName?: string;
  }>;
  overdueTasks: Array<{
    id: string;
    title: string;
    dueDate: string;
    projectName?: string;
  }>;
  meetings: Array<{
    title: string;
    startTime: string;
    endTime: string;
    attendees?: string[];
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    createdAt: string;
  }>;
  blockers: Array<{
    id: string;
    title: string;
    reason?: string;
    projectName?: string;
  }>;
}

export interface BriefingResult {
  briefing: string;
  todaysTasks: BriefingContext["todayTasks"];
  todaysMeetings: BriefingContext["meetings"];
  blockers: BriefingContext["blockers"];
  unreadCount: number;
}

export async function generateBriefing(
  context: BriefingContext
): Promise<BriefingResult> {
  const systemPrompt = getBriefingPrompt({
    userName: context.firstName,
    dayOfWeek: context.dayOfWeek,
    timezone: context.timezone,
  });

  const userMessage = `## Today's Date
${context.date} (${context.dayOfWeek})

## Today's Tasks (${context.todayTasks.length})
${formatTasks(context.todayTasks)}

## This Week's Remaining Tasks (${context.weekTasks.length})
${formatTasks(context.weekTasks)}

## Overdue Tasks (${context.overdueTasks.length})
${context.overdueTasks.length > 0 ? context.overdueTasks.map((t) => `- "${t.title}" — due ${t.dueDate}${t.projectName ? ` (${t.projectName})` : ""}`).join("\n") : "None"}

## Today's Meetings (${context.meetings.length})
${context.meetings.length > 0 ? context.meetings.map((m) => `- ${m.title}: ${m.startTime} - ${m.endTime}${m.attendees?.length ? ` (with ${m.attendees.join(", ")})` : ""}`).join("\n") : "No meetings scheduled"}

## Blockers (${context.blockers.length})
${context.blockers.length > 0 ? context.blockers.map((b) => `- "${b.title}"${b.reason ? `: ${b.reason}` : ""}${b.projectName ? ` (${b.projectName})` : ""}`).join("\n") : "No blockers"}

## Recent Activity (last 24h)
${context.recentActivity.length > 0 ? context.recentActivity.slice(0, 10).map((a) => `- [${a.type}] ${a.description}`).join("\n") : "No recent activity"}`;

  const content = await chatCompletion("briefer", {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  // Parse the JSON response
  let parsed: { briefing: string; highlights: string[]; riskFlags: string[] };
  try {
    let jsonStr = content;
    // Handle case where model wraps in code block despite instructions
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    parsed = JSON.parse(jsonStr);
  } catch {
    // If JSON parsing fails, treat the whole response as the briefing text
    parsed = {
      briefing: content,
      highlights: [],
      riskFlags: [],
    };
  }

  return {
    briefing: parsed.briefing,
    todaysTasks: context.todayTasks,
    todaysMeetings: context.meetings,
    blockers: context.blockers,
    unreadCount: context.recentActivity.length,
  };
}

function formatTasks(
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
    projectName?: string;
  }>
): string {
  if (tasks.length === 0) return "None";
  return tasks
    .map(
      (t) =>
        `- "${t.title}" [${t.status}] (${t.priority})${t.dueDate ? ` — due ${t.dueDate}` : ""}${t.projectName ? ` (${t.projectName})` : ""}`
    )
    .join("\n");
}
