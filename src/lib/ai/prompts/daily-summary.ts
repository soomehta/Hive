export function getDailySummaryPrompt(activities: string): string {
  return `Summarize this user's day in 2-3 concise sentences. Highlight accomplishments and key activities. Be encouraging but professional. Do not use emojis.

Activities today:
${activities}`;
}
