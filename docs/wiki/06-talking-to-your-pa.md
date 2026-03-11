# Talking to Your PA

Your Personal Assistant (PA) is the primary way to interact with Hive. Instead of clicking through menus and forms, you type or speak what you need in natural language and the PA handles it.

---

## 1. Opening the PA Chat

The PA panel is a slide-out chat interface on the right side of the dashboard.

- **Click the PA button** — a floating button on the right side of the screen (or in the header)
- The panel slides open revealing your conversation history
- The PA panel **persists across page navigation** — your conversation stays even when you switch pages

---

## 2. Sending a Text Message

1. Open the PA panel.
2. Type your request in the text input at the bottom.
3. Press **Enter** or click the send button.
4. The PA processes your message and responds.

### What You Can Say

The PA understands natural language. You don't need to memorize commands — just describe what you need:

**Managing tasks:**
> "Create a task in Website Redesign: Design the homepage header, assign to Sarah, due Friday"
> "What are my tasks for today?"
> "Mark the API documentation task as done"
> "I'm blocked on the deployment — waiting for server access"

**Checking information:**
> "How's the Mobile App project going?"
> "What's on my calendar tomorrow?"
> "Do I have any unread emails?"
> "Who's overloaded on the team right now?"

**Communication:**
> "Post a message in Design Sprint: The client approved mockup v3"
> "Send an email to sarah@company.com with a project update"
> "Send a Slack message to #engineering: Deploy is scheduled for 3pm"

**Reports:**
> "Give me a status report on Website Redesign"
> "What's at risk this week?"
> "What did the team accomplish last week?"

**Calendar:**
> "Block 2 hours tomorrow morning for deep work"
> "Schedule a meeting with Sarah and Alex for Thursday at 2pm"

---

## 3. How the PA Processes Your Message

When you send a message, here's what happens behind the scenes:

```
Your message
    |
    v
Intent Classification (GPT-4o-mini)
    |-- What do you want to do? (create task, check calendar, etc.)
    |-- What details did you mention? (project name, person, date, etc.)
    v
Action Planning (Claude Sonnet)
    |-- What specific action(s) to take
    |-- What permission tier applies
    v
Execution or Draft
    |-- Auto-execute: done immediately, you get a confirmation
    |-- Draft+Approve: you see a preview, approve/edit/reject
    v
Response
    |-- PA tells you what happened
```

### Intent Classification

The PA recognizes these categories of requests:

| Category | Intents | Example |
|----------|---------|---------|
| **Queries** | Check tasks, calendar, email, project status, workload | "What's on my plate?" |
| **Task actions** | Create, update, complete, delete tasks; add comments; flag blockers | "Create a task for..." |
| **Communication** | Post messages, send emails, send Slack messages | "Email Sarah about..." |
| **Calendar** | Block time, schedule meetings, reschedule | "Block 2 hours for..." |
| **Reports** | Status reports, briefings, analysis | "How's the team doing?" |

### Entity Extraction

The PA automatically extracts details from your natural language:

- **Project names** — fuzzy matched (e.g., "Phoenix" matches "Project Phoenix")
- **Team member names** — fuzzy matched (e.g., "Sarah" matches "Sarah Chen")
- **Dates** — relative dates are understood ("tomorrow", "next Tuesday", "end of week", "Friday")
- **Durations** — "30 minutes", "2 hours", "half an hour"
- **Priority** — defaults to "medium" if not specified
- **Status** — defaults to "todo" for new tasks

---

## 4. Conversation Continuity

The PA remembers your recent conversation. The last 10 messages are loaded for context, so you can have natural follow-ups:

> **You:** "Create a task in Website Redesign: Fix the navigation bug"
> **PA:** "Done! I've created the task 'Fix the navigation bug' in Website Redesign."
> **You:** "Actually, make it high priority"
> **PA:** "Updated — 'Fix the navigation bug' is now high priority."
> **You:** "And assign it to Alex"
> **PA:** "Assigned to Alex Chen."

---

## 5. Chat History

Your PA conversation is saved and persists across sessions.

- When you return to Hive, your previous conversation is loaded
- Use the chat history to review past actions and responses
- Chat sessions help the PA learn your patterns over time (see [PA Profile](./17-pa-profile-and-preferences.md))

---

## 6. When the PA Doesn't Understand

If the PA can't confidently classify your intent (confidence is low), it will:

1. Ask you to clarify: "I'm not sure I understood. Did you mean...?"
2. Offer suggestions based on what it thinks you meant
3. Never execute an ambiguous action — it errs on the side of asking

You can always rephrase:
> "I mean create a task, not a message"

---

## 7. PA Responses

The PA responds with:

- **Text responses** — natural language answers and confirmations
- **Action cards** — when the PA needs your approval (see [Actions & Approvals](./08-actions-and-approvals.md))
- **Report cards** — formatted narrative reports (see [Reports](./11-reports.md))
- **Briefing cards** — your morning briefing summary (see [Briefings](./10-briefings-and-digests.md))

---

## 8. Tips for Effective PA Communication

1. **Be specific** — "Create a task in Project Phoenix: Review PR #42, assign to Sarah, due Friday" works better than "I need someone to look at that pull request"
2. **Name your projects and people** — the PA fuzzy-matches, but exact names help
3. **Specify dates** — "due Friday" or "due March 15" instead of "due soon"
4. **Use follow-ups** — you don't have to repeat context; the PA remembers your recent conversation
5. **Review drafts** — when the PA shows you a draft action, take a moment to verify the details before approving

---

## Next Steps

- **[Voice Commands](./07-voice-commands.md)** — speak instead of type
- **[Actions & Approvals](./08-actions-and-approvals.md)** — understand the approval workflow
- **[Autonomy Settings](./09-autonomy-settings.md)** — control how independently your PA acts
