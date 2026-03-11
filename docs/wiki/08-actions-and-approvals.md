# Actions & Approvals

When your PA processes a request that changes something — creating a task, sending an email, posting a message — it uses Hive's **graduated autonomy** system. This page explains how actions work, what approval tiers mean, and how to approve, edit, or reject PA drafts.

---

## 1. What Is an Action?

An action is any operation the PA performs on your behalf. Actions range from simple queries (which don't need approval) to external communications (which almost always need your sign-off).

### Action Types

| Category | Action Types |
|----------|-------------|
| **Queries** | Check tasks, check calendar, check email, check project status, check workload |
| **Task mutations** | Create task, update task, complete task, delete task, add comment, flag blocker |
| **Communication** | Post message, send email, send Slack message |
| **Calendar** | Block time, create event, reschedule event |
| **Reports** | Generate report, generate briefing |

---

## 2. Action Tiers (Graduated Autonomy)

Every action type has a **default tier** that controls how much freedom the PA has:

### Tier 1: Auto-Execute
The PA does it immediately and shows you what it did.

- **Used for:** Queries (checking tasks, calendar, project status, workload, emails)
- **Example:** You say "What are my tasks today?" → PA queries and responds instantly
- **No approval needed**

### Tier 2: Execute + Notify
The PA does it immediately, then notifies you of what it did.

- **Used for:** Low-risk mutations (creating tasks for yourself, updating task status, completing tasks, adding comments, flagging blockers, blocking calendar time, generating reports)
- **Example:** You say "Mark the design task as done" → PA completes it and tells you
- **No approval needed, but you're always informed**

### Tier 3: Draft + Approve
The PA creates a draft and waits for you to approve, edit, or reject it.

- **Used for:** Actions visible to others or with external impact (posting messages, scheduling meetings with others, sending emails, sending Slack messages)
- **Example:** You say "Send an email to the client about the delay" → PA drafts the email and shows you a preview

### Tier 4: Suggest Only
The PA suggests an action but doesn't prepare a draft. You decide.

- **Used for:** When set by the user for extra-sensitive actions
- **Example:** PA suggests "You might want to update the deadline on Project X"

---

## 3. The Approval Workflow

When an action is at the **Draft + Approve** tier, here's what you see:

### Step 1: PA Shows the Draft

The PA sends an **action card** in the chat. For example, for an email:

```
+------------------------------------------+
|  DRAFT: Send Email                       |
|                                          |
|  To: sarah@company.com                   |
|  Subject: Project Update - Q1 Launch     |
|  Body:                                   |
|  Hi Sarah,                               |
|  I wanted to give you a quick update...  |
|                                          |
|  [Approve]  [Edit]  [Reject]             |
+------------------------------------------+
```

### Step 2: You Choose

You have three options:

#### Approve
- Click **Approve** to execute the action exactly as drafted
- The PA executes it and confirms: "Email sent to sarah@company.com"

#### Edit
- Click **Edit** to modify the draft before executing
- An editable form appears where you can change any field (email body, task title, etc.)
- After editing, click **Send** / **Confirm** to execute with your changes
- The PA records your edit as a "correction" to improve future drafts

#### Reject
- Click **Reject** to cancel the action entirely
- Optionally provide a reason: "Wrong tone" or "I'll handle this manually"
- The PA records the rejection to learn from it

### Step 3: Execution

After you approve or edit:
- The action is executed (email sent, task created, message posted, etc.)
- An activity log entry is recorded
- Relevant notifications are sent to other users
- The PA confirms what happened

---

## 4. Pending Actions

Actions waiting for your approval are called **pending actions**. They have a 24-hour expiry window.

### Viewing Pending Actions

1. Pending actions appear as action cards in your PA chat
2. You can also check via your PA: "Do I have any pending actions?"
3. Pending actions show up in your notifications

### Action Expiry

- If you don't act on a pending action within **24 hours**, it automatically expires
- Expired actions are marked as `expired` and are not executed
- The PA may remind you about important pending actions before they expire

---

## 5. How Tiers Are Determined

The tier for any given action is determined by a priority system:

1. **Your per-action overrides** (highest priority) — you can set specific tiers for each action type in [PA Settings](./09-autonomy-settings.md)
2. **Your autonomy mode** — Autopilot, Copilot, or Manual mode adjusts defaults
3. **Default tier** — the built-in default for the action type

### Special Rules

- **Creating a task for someone else** — in Copilot mode, this bumps from Tier 2 (Execute + Notify) to Tier 3 (Draft + Approve), since it affects another person
- **Manual mode** — everything becomes Draft + Approve
- **Autopilot mode** — Tier 2 actions auto-execute, but Tier 3 actions still require approval (safety net for external communications)

---

## 6. Integration Requirements

Some actions require a connected integration to work:

| Action | Required Integration |
|--------|---------------------|
| Check/manage calendar | Google or Microsoft |
| Check/send email | Google or Microsoft |
| Send Slack message | Slack |

If you try an action that requires an unconnected integration, the PA will tell you:

> "Google is not connected. Please connect it in Settings > Integrations."

See the [integration guides](./14-google-integration.md) for setup instructions.

---

## 7. PA Learning from Your Feedback

Every time you edit or reject an action, the PA records it as a **correction**. Over time, these corrections help the PA:

- Match your email tone and writing style
- Choose the right project and people
- Adjust draft quality and detail level
- Better predict your preferences

The more you interact, the better your PA gets. See [PA Profile & Preferences](./17-pa-profile-and-preferences.md) for details on learned patterns.

---

## 8. Example Scenarios

### Scenario: Creating a Task (Copilot Mode)

> **You:** "Create a task: Update the API documentation"
> **PA:** "Done! I've created 'Update the API documentation' in your current project, assigned to you, medium priority."

No approval needed — creating a task for yourself is Tier 2.

### Scenario: Creating a Task for Someone Else (Copilot Mode)

> **You:** "Create a task for Sarah: Review the pull request by Friday"
> **PA shows draft:**
> ```
> DRAFT: Create Task
> Title: Review the pull request
> Project: Website Redesign
> Assignee: Sarah Chen
> Due: Friday, March 7
> Priority: Medium
>
> [Approve]  [Edit]  [Reject]
> ```
> **You click Approve.**
> **PA:** "Task created and Sarah has been notified."

Approval required — assigning to someone else bumps to Tier 3 in Copilot mode.

### Scenario: Sending an Email

> **You:** "Email the client about the project delay"
> **PA shows draft:**
> ```
> DRAFT: Send Email
> To: client@example.com
> Subject: Project Timeline Update
> Body: Dear Client, I wanted to let you know that we've encountered
> a brief delay in the project timeline...
>
> [Approve]  [Edit]  [Reject]
> ```
> **You click Edit, change the tone, then click Send.**
> **PA:** "Email sent. I've noted your preferred tone for future emails."

---

## Next Steps

- **[Autonomy Settings](./09-autonomy-settings.md)** — customize which actions need approval
- **[PA Profile & Preferences](./17-pa-profile-and-preferences.md)** — fine-tune your PA's behavior
