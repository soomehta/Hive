# Reports

Hive replaces dashboards with conversational reports. Instead of staring at charts, you ask questions in plain English and get narrative answers backed by real data.

---

## 1. How Reports Work

1. You ask a question — by typing or speaking
2. The PA analyzes your project data (tasks, activity, workload, velocity)
3. Claude generates a narrative report tailored to your role
4. You see the answer as a formatted report in the Reports page or PA chat

Reports are **not pre-built dashboards** — they're generated on demand from live data, so they always reflect the current state of your workspace.

---

## 2. Accessing Reports

### Reports Page

1. Click **Reports** in the sidebar.
2. You'll see a chat-like interface (full-width, not in the PA side panel).
3. Type or speak your question.
4. The report appears below your question.

### Suggested Questions

The Reports page shows **suggested question chips** to help you get started:

- "How's the team doing?"
- "What's at risk?"
- "Weekly summary"
- "Who's overloaded?"
- "What did we accomplish this week?"

Click any chip to ask that question.

### From the PA Chat

You can also ask report questions directly in the PA panel:

> "Give me a status report on Website Redesign"
> "What's at risk this week?"

---

## 3. Types of Reports

The PA recognizes different report types from your question and adjusts the data it gathers:

### Status Summary
**Ask:** "How's [project/team] doing?"

Returns: Overall progress, task completion rate, recent milestones, blockers, and outlook.

### Risk Analysis
**Ask:** "What's at risk?" / "Are we going to hit the deadline?"

Returns: Overdue tasks, blocked tasks, approaching deadlines, workload imbalances, and a probability assessment.

### Accomplishment Report
**Ask:** "What did we accomplish this week?" / "What shipped?"

Returns: Completed tasks, milestones reached, key activity, and team highlights.

### Workload Analysis
**Ask:** "Who's overloaded?" / "How's the team's workload?"

Returns: Task counts per person, workload distribution, who has capacity, and recommendations.

### Comparison Report
**Ask:** "This week vs last week" / "How are we trending?"

Returns: Velocity trends, completion rate changes, and momentum indicators.

### Prediction Report
**Ask:** "Will we hit the deadline?" / "When will this project finish?"

Returns: Probability assessment based on velocity, remaining tasks, and historical performance.

### Executive Summary
**Ask:** "What should I tell the board?" / "Give me an executive summary"

Returns: High-level summary focused on business impact, timeline risk, and key decisions needed.

---

## 4. Report Scoping

Reports can be scoped to different levels:

| Scope | How to Trigger | Example |
|-------|---------------|---------|
| **Project** | Name the project | "How's Website Redesign going?" |
| **Team** | Ask about "the team" | "How's the team doing this sprint?" |
| **Personal** | Ask about "my" work | "How am I doing on my tasks?" |
| **Organization** | Ask broadly or say "org-wide" | "Give me an org-wide status report" |

Note: Org-wide reports are only available to **Owners** and **Admins**. Members see reports scoped to their visible projects.

---

## 5. Report Content

Every report includes a **narrative** and optionally **structured data**.

### Narrative
A natural-language report written by the PA. It follows these rules:
- Leads with the most important insight
- Names specific people, tasks, and dates
- Gives probability estimates for predictions
- Mentions blockers and risks
- Ends with a recommended action or focus area
- Keeps under 300 words (unless you ask for detail)
- Uses a conversational tone — not formal report language

### Structured Data (Behind the Scenes)
The PA gathers and uses:
- Total task count and completion counts
- Completion rate as a percentage
- Overdue and blocked task counts
- Velocity trend (tasks completed per week, last 4 weeks)
- Top risks and accomplishments
- Workload distribution by person

---

## 6. Role-Aware Reports

Reports are tailored to your role in the organization:

| Role | Focus |
|------|-------|
| **Individual Contributor** | Your tasks, immediate team, tactical details |
| **Team Lead** | Team health, blockers, velocity, workload balance |
| **Admin / Owner** | Org-wide metrics, timeline risk, business impact, milestones |

The PA determines your role from your organization membership and job title.

---

## 7. Exporting Reports

After a report is generated, you can export it:

1. Click the **Export** button on the report.
2. Choose a format:
   - **Markdown** — plain text file for sharing or pasting
   - **PDF** — formatted document for stakeholders
3. The file downloads to your device.

---

## 8. Scheduled Reports

You can set up reports to run automatically on a schedule.

### Creating a Scheduled Report

This feature allows admins/owners to configure recurring reports:

- **Name** — a label for the report (e.g., "Weekly Engineering Status")
- **Prompt** — the natural language question (e.g., "Weekly status for all active projects")
- **Schedule** — daily, weekly, or monthly
- **Delivery channel** — in-app, email, or Slack
- **Recipients** — which team members receive it

---

## 9. Example Report Questions

| Question | What You Get |
|----------|-------------|
| "How's the team doing?" | Overall status, completion rate, blockers, velocity |
| "What's at risk this week?" | Overdue tasks, approaching deadlines, blocked items |
| "What did we accomplish last week?" | Completed tasks, milestones, highlights |
| "Who's overloaded?" | Task counts per person, workload imbalance |
| "Will we hit the March 31 deadline?" | Probability based on velocity and remaining work |
| "Compare this week to last week" | Velocity change, task counts, momentum |
| "What should I tell stakeholders?" | Executive summary with business impact |
| "How's Project Phoenix going?" | Project-scoped status with detail |
| "What did Sarah work on this week?" | Individual contributor report |
| "What's blocking the launch?" | All blockers across the project |

---

## 10. Tips

1. **Be specific about scope** — "How's Website Redesign?" is better than "How are things?"
2. **Specify timeframes** — "this week" or "last month" helps the PA gather the right data
3. **Follow up** — after getting a report, ask follow-up questions: "Tell me more about the blockers"
4. **Use reports before meetings** — ask for a project status 5 minutes before a standup
5. **Export for stakeholders** — use the export feature to share reports externally

---

## Next Steps

- **[My Tasks](./12-my-tasks.md)** — your personal task view
- **[Briefings & Digests](./10-briefings-and-digests.md)** — automated daily and weekly summaries
