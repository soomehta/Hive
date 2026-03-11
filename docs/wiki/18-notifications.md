# Notifications

Hive keeps you informed about what matters without overwhelming you. This page covers all notification types, delivery channels, and how to manage them.

---

## 1. Notification Types

### Task Notifications

| Type | When It Fires | Who Gets It |
|------|---------------|-------------|
| **Task Assigned** | A task is assigned to you | The assignee |
| **Task Completed** | A task you created or are involved in is completed | Task creator, collaborators |
| **Task Overdue** | Your task passes its due date | The assignee |
| **Task Commented** | Someone comments on your task | Task assignee and creator (if different from commenter) |

### Project Notifications

| Type | When It Fires | Who Gets It |
|------|---------------|-------------|
| **Blocker Flagged** | A task in your project is blocked | Project lead |
| **Message Posted** | A message is posted to your project | All project members (except author) |
| **Project Created** | A new project is created in your org | Org members (configurable) |
| **Member Invited** | Someone is invited to the org | Admins and owners |

### PA Notifications

| Type | When It Fires | Who Gets It |
|------|---------------|-------------|
| **Action Pending** | The PA created a draft action waiting for approval | You |
| **Briefing** | Your morning briefing is ready | You |
| **Nudge** | Overdue or stale task reminder | You |
| **Report Ready** | A requested report has been generated | You |

---

## 2. Where Notifications Appear

### In-App Notifications

- **Notification bell** — in the top-right header bar, showing an unread count badge
- Click the bell to see a dropdown list of your recent notifications
- Each notification shows: icon, title, brief body, and timestamp
- Click a notification to navigate to the relevant item (task, project, etc.)

### Real-Time Delivery

Notifications are delivered in real-time via **Server-Sent Events (SSE)**. When someone assigns you a task or comments on your work, the notification appears instantly — no need to refresh.

SSE also powers:
- **Action updates** — when a PA action status changes (approved, executed, etc.)
- **Task updates** — live UI updates when tasks are modified

### Email Notifications

When your notification channel is set to "Email":
- Briefings, digests, and nudges are sent to your email
- Invitation emails are always sent via email regardless of your setting
- Transactional notifications (task assigned, etc.) can optionally be emailed

### Slack Notifications

When your notification channel is set to "Slack" and [Slack is connected](./16-slack-integration.md):
- Briefings, digests, and nudges are sent as Slack DMs
- Best for teams that live in Slack

---

## 3. Managing Notifications

### Marking as Read

- **Individual** — click a notification to mark it as read
- **Bulk** — click "Mark all as read" in the notification dropdown

### Choosing Your Notification Channel

1. Go to **Settings > PA Settings**.
2. Under **Notification Channel**, select:
   - **In-app** (default) — notifications appear in the Hive UI
   - **Email** — notifications sent to your email
   - **Slack** — notifications sent as Slack DMs

This setting affects briefings, digests, and proactive nudges. In-app notifications always appear regardless of this setting.

---

## 4. Notification Volume Control

Hive is designed to be **calm** — it won't spam you. Here's how noise is controlled:

| Feature | Noise Control |
|---------|---------------|
| **Overdue nudges** | Max once per 24 hours per task |
| **Stale task detection** | Once per task, daily check |
| **Briefings** | Once per day at your configured time |
| **Weekly digest** | Once per week on your configured day |
| **Working hours** | Nudges only fire during your working hours |

### If You're Getting Too Many Notifications

1. **Disable unnecessary briefings** — turn off end-of-day digest if you don't need it
2. **Switch channel** — move to email or Slack to batch notifications
3. **Resolve tasks** — complete or close stale/overdue tasks to stop nudges
4. **Adjust working hours** — narrow your working hours to reduce the notification window

### If You're Missing Notifications

1. **Check your notification channel** — make sure it's set to where you actually look
2. **Ensure integrations are connected** — Slack notifications require an active Slack connection
3. **Check browser permissions** — in-app notifications require the browser tab to be open (SSE)

---

## 5. SSE Connection

Hive uses **Server-Sent Events** for real-time notifications. Key things to know:

- **Automatic connection** — established when you open the dashboard
- **Reconnects automatically** — if the connection drops, it reconnects
- **No WebSockets** — SSE is simpler and more firewall-friendly
- **Tab must be open** — real-time notifications only work while the Hive tab is open
- **No push notifications** — Hive doesn't send browser push notifications (by design, to stay calm)

---

## 6. Example PA Commands

| What You Want | What to Say |
|---------------|-------------|
| Check notifications | "Do I have any unread notifications?" |
| Check pending actions | "Do I have any pending actions?" |
| Change notification channel | "Send my notifications via email" |
| Check overdue tasks | "Am I overdue on anything?" |

---

## 7. Tips

1. **Check the bell icon regularly** — or ask your PA "Any notifications?"
2. **Use email channel if you don't check Hive frequently** — ensures you don't miss important updates
3. **Morning briefing replaces manual notification checking** — the briefing summarizes everything you need to know
4. **Read and dismiss notifications** — keeping a clean notification inbox reduces cognitive load

---

## Back to Guide

- **[Table of Contents](./README.md)** — return to the full guide index
- **[PA Profile & Preferences](./17-pa-profile-and-preferences.md)** — customize notification settings
