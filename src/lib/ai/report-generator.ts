import Anthropic from "@anthropic-ai/sdk";
import { getReportGenerationPrompt } from "./prompts/report-generation";

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _anthropic;
}

export interface ReportData {
  tasksByStatus: Record<string, number>;
  tasksByAssignee: Record<string, number>;
  tasksByPriority: Record<string, number>;
  completionRate: number;
  overdueTasks: Array<{
    id: string;
    title: string;
    assignee?: string;
    dueDate: string;
  }>;
  blockers: Array<{ id: string; title: string; assignee?: string }>;
  velocity: number[]; // tasks completed per week, trailing 4 weeks
  upcomingDeadlines: Array<{ id: string; title: string; dueDate: string }>;
  workloadByPerson: Record<string, number>;
  recentActivity: Array<{
    type: string;
    description: string;
    createdAt: string;
  }>;
}

export interface ReportResult {
  narrative: string;
  data: ReportData;
  generatedAt: string;
}

export async function generateReport(
  question: string,
  data: ReportData,
  context: { role: string; name: string; date: string }
): Promise<ReportResult> {
  const systemPrompt = getReportGenerationPrompt(context);

  const userMessage = `## User Question
${question}

## Project Data
${JSON.stringify(data, null, 2)}`;

  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Empty response from report generator");
  }

  return {
    narrative: textBlock.text,
    data,
    generatedAt: new Date().toISOString(),
  };
}
