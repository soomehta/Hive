import { chatCompletion } from "./providers";
import { getReportGenerationPrompt } from "./prompts/report-generation";

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

  const content = await chatCompletion("reporter", {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  return {
    narrative: content,
    data,
    generatedAt: new Date().toISOString(),
  };
}
