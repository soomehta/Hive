# Messages & Activity Feed

Hive uses asynchronous communication — no real-time presence or typing indicators. Messages are thoughtful posts (like Basecamp), and the activity feed is your single source of truth for everything happening in the workspace.

---

## Messages

### What Messages Are

Messages in Hive are project-level posts — think announcements, updates, decisions, and discussions. They're not instant-chat; they're meant for thoughtful, async communication.

Each message has:
- **Title** (optional) — a subject line for the post
- **Content** (required) — the body of the message
- **Author** — who posted it
- **Timestamp** — when it was posted
- **Pinned status** — important messages can be pinned to the top

### Posting a Message

#### From the UI

1. Open a project and go to the **Messages** tab.
2. Click **New Message** (or use the message composer at the top).
3. Fill in:
   - **Title** (optional) — e.g., "Design Review Decisions"
   - **Content** (required) — your message text
4. Click **Post**.

#### Using Your PA

> "Post a message in Website Redesign: The client approved the new navigation design. We'll move forward with option B."

Since posting a message affects the whole team, the default behavior is **Draft + Approve** — the PA will show you a preview before posting. You can approve, edit, or cancel.

### Viewing Messages

1. Open a project and click the **Messages** tab.
2. Messages are displayed in reverse chronological order (newest first).
3. Pinned messages appear at the top regardless of date.
4. Each message card shows the title, a content preview, the author, and the timestamp.

### Editing a Message

1. Find the message in the project's Messages tab.
2. Click the options menu (three dots) on the message.
3. Click **Edit**.
4. Modify the title or content.
5. Click **Save**.

You can only edit your own messages (unless you're an admin or owner).

### Deleting a Message

1. Click the options menu on the message.
2. Click **Delete**.
3. Confirm the deletion.

Only the author, project lead, admins, and owners can delete messages.

### Pinning a Message

Admins, owners, and project leads can pin messages:

1. Click the options menu on the message.
2. Click **Pin Message**.
3. The message moves to the top of the list with a pinned indicator.

To unpin, repeat the process and click **Unpin**.

---

## Activity Feed

### What the Activity Feed Is

The activity feed is a chronological log of everything that happens in Hive. Every state-changing action — creating a task, completing it, posting a message, flagging a blocker — is recorded.

The activity feed is:
- The **single source of truth** for what happened and when
- Used by the PA for context when generating reports and briefings
- Filterable by project, user, type, and date range

### Viewing the Activity Feed

#### On the Dashboard (Home)

The Home page shows the last 20 activity items across all your projects in the **Recent Activity** section.

#### On a Project Page

The project's Overview tab shows recent activity for that specific project.

#### Via Your PA

> "What happened in Website Redesign this week?"
> "Show me recent activity"

### Activity Entry Types

| Type | Description | Example |
|------|-------------|---------|
| `task_created` | A new task was created | "Sarah created 'Design login page'" |
| `task_updated` | A task's details changed | "Alex changed priority to High" |
| `task_completed` | A task was marked done | "Marcus completed 'API documentation'" |
| `task_deleted` | A task was deleted | "Sarah deleted 'Old task'" |
| `task_assigned` | A task was assigned to someone | "Sarah assigned 'Code review' to Alex" |
| `task_commented` | Someone commented on a task | "Alex commented on 'Design login page'" |
| `blocker_flagged` | A task was flagged as blocked | "Marcus flagged 'Deployment' as blocked" |
| `blocker_resolved` | A blocker was resolved | "Marcus resolved the blocker on 'Deployment'" |
| `message_posted` | A message was posted to a project | "Sarah posted 'Sprint Retrospective Notes'" |
| `project_created` | A new project was created | "Sarah created project 'Mobile App'" |
| `project_updated` | Project details were changed | "Sarah changed project status to Paused" |
| `member_joined` | Someone joined the organization | "Alex joined the team" |
| `member_left` | Someone left the organization | "Jordan left the team" |
| `pa_action_executed` | The PA executed an action | "PA created task 'Review PR #42' for Sarah" |
| `pa_report_generated` | A report was generated | "PA generated weekly status report" |

### Filtering the Activity Feed

The activity feed supports these filters:

| Filter | Description |
|--------|-------------|
| **Project** | Show activity for a specific project only |
| **User** | Show activity by a specific person |
| **Type** | Filter by activity type (e.g., only task completions) |
| **Date range** | Show activity between specific dates |

---

## Example PA Commands

| What You Want | What to Say |
|---------------|-------------|
| Post a message | "Post in Mobile App: Sprint 3 starts Monday, focus on user auth" |
| Check activity | "What happened in the team today?" |
| Check project activity | "Show me recent activity in Website Redesign" |
| Check someone's work | "What did Sarah work on this week?" |

---

## Next Steps

- **[Talk to your PA](./06-talking-to-your-pa.md)** — use your PA to manage messages and stay up to date
- **[Reports](./11-reports.md)** — the activity feed powers your narrative reports
