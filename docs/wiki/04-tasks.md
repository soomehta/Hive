# Tasks

Tasks are the core unit of work in Hive. Every task belongs to a project and tracks what needs to be done, who's responsible, and when it's due.

---

## 1. Creating a Task

### From the UI

1. Navigate to a project and open the **Tasks** tab.
2. Click **New Task** (or click the "+" in any Kanban column).
3. Fill out the form:
   - **Title** (required) — a clear, actionable title (e.g., "Design login page mockup")
   - **Description** (optional) — additional context, requirements, or links
   - **Status** — Todo (default), In Progress, In Review, or Done
   - **Priority** — Low, Medium (default), High, or Urgent
   - **Assignee** (optional) — who is responsible for this task
   - **Due Date** (optional) — when it needs to be completed
   - **Estimated Time** (optional) — estimated effort in minutes
   - **Parent Task** (optional) — link to a parent task for subtask relationships
4. Click **Create Task**.

### Using Your PA

Ask your PA in natural language:

> "Create a task in Website Redesign: Design the login page, assign to Sarah, due Friday, high priority"

The PA extracts all the details, creates the task, and confirms. If you're in **Copilot** mode and assigning to someone else, the PA will show you a draft to approve first.

> "Add a task to review the API docs by end of week"

If you don't specify a project, the PA will ask you to clarify or use the most likely project based on context.

---

## 2. Viewing Tasks

### Kanban Board View

The default task view within a project is the Kanban board with four columns:

```
+--------+-------------+------------+--------+
|  TODO  | IN PROGRESS | IN REVIEW  |  DONE  |
+--------+-------------+------------+--------+
| Task A | Task C      | Task E     | Task F |
| Task B | Task D      |            | Task G |
|        |             |            |        |
+--------+-------------+------------+--------+
```

- **Drag and drop** tasks between columns to change their status.
- Tasks are ordered by position within each column (also drag to reorder).
- Each task card shows: title, priority badge, assignee avatar, and due date.

### List View

Toggle to list view using the view switcher in the top-right corner of the tasks tab.

- Tasks displayed in a table/list format
- Sortable by: due date, priority, creation date, or position
- Same information as the Kanban cards but in a denser format

### My Tasks Page

Click **My Tasks** in the sidebar to see all tasks assigned to you across every project, grouped into:

- **Today** — tasks due today
- **This Week** — tasks due in the next 7 days
- **Later** — tasks due after this week
- **No Date** — tasks without a due date

More details in the [My Tasks guide](./12-my-tasks.md).

---

## 3. Task Detail Panel

Click any task (in Kanban, list, or My Tasks) to open the **task detail slide-out panel**. It contains:

### Header
- Task title (editable)
- Status badge (clickable to change)
- Priority badge (clickable to change)

### Details Section
- **Assignee** — who's working on it (clickable to reassign)
- **Due date** — when it's due (clickable to change)
- **Project** — which project it belongs to
- **Created by** — who created the task
- **Estimated time** — effort estimate
- **Blocked status** — whether the task is blocked and why

### Description
- Rich text area with the task description
- Click to edit

### Comments Thread
- View all comments on this task
- Add a new comment at the bottom
- Comments show author, timestamp, and whether they were posted by a PA

### Activity
- Timeline of changes: status updates, reassignments, edits

---

## 4. Editing a Task

### From the UI

1. Open the task detail panel by clicking the task.
2. Click any field to edit it:
   - Click the title to rename
   - Click the status badge to change status
   - Click the assignee to reassign
   - Click the due date to change it
   - Edit the description inline
3. Changes save automatically.

### Using Your PA

> "Change the priority of 'Design login page' to urgent"
> "Move 'API documentation' to in review"
> "Reassign 'Fix header bug' to Alex"
> "Push the due date on 'Design mockups' to next Wednesday"

---

## 5. Completing a Task

### From the UI

- In the Kanban board: drag the task to the **Done** column.
- In the task detail: click the status badge and select **Done**.
- Check the completion checkbox (if displayed on the task card).

### Using Your PA

> "Mark 'Design login page' as done"
> "Complete the API documentation task"

When a task is completed:
- The `completedAt` timestamp is recorded
- An activity entry (`task_completed`) is logged
- Relevant team members are notified

---

## 6. Task Comments

Comments are threaded discussions on a specific task — use them for updates, questions, and decisions.

### Adding a Comment

1. Open the task detail panel.
2. Scroll to the **Comments** section at the bottom.
3. Type your comment in the text area.
4. Click **Post Comment**.

### Using Your PA

> "Add a comment on 'Design login page': The client approved the color scheme, proceed with implementation"

When a comment is posted:
- The task assignee and creator are notified (if different from the commenter)
- An activity entry (`task_commented`) is logged
- The comment is embedded for search/reporting

---

## 7. Flagging Blockers

If you're stuck on a task, flag it as blocked:

### From the UI

1. Open the task detail panel.
2. Click the **Flag as Blocked** button or toggle.
3. Enter a reason (e.g., "Waiting on design assets from the design team").
4. Save.

### Using Your PA

> "I'm blocked on the API integration task — waiting for credentials from DevOps"

When a blocker is flagged:
- The task's `isBlocked` field is set to `true`
- The blocker reason is recorded
- The project lead is notified
- An activity entry (`blocker_flagged`) is logged
- The blocker shows up in project overviews and reports

### Resolving Blockers

- Edit the task and uncheck the blocked flag, or
- Ask your PA: "The API integration is no longer blocked"

---

## 8. Filtering and Searching Tasks

### Filter Bar

At the top of the task list/board view, use the filter bar to narrow down tasks:

| Filter | Options |
|--------|---------|
| **Status** | Todo, In Progress, In Review, Done |
| **Priority** | Low, Medium, High, Urgent |
| **Assignee** | Any team member |
| **Due Date** | Before/after a specific date |
| **Blocked** | Show only blocked tasks |
| **Search** | Full-text search on title and description |

Filters combine with AND logic — adding a status filter and a priority filter shows tasks matching both.

### Sorting

Sort tasks by:
- **Due Date** — soonest first
- **Priority** — urgent first
- **Created Date** — newest first
- **Position** — manual ordering (Kanban default)

### Using Your PA

> "Show me all urgent tasks in Website Redesign"
> "What tasks are overdue?"
> "Which tasks are blocked right now?"

---

## 9. Subtasks

Tasks can have parent-child relationships for breaking down large pieces of work.

### Creating a Subtask

1. Open a task detail panel.
2. Click **Add Subtask** (if available).
3. Fill in the subtask form — same fields as a regular task.
4. The subtask's `parentTaskId` links it to the parent.

### Using Your PA

> "Add a subtask to 'Design login page': Create the mobile responsive version"

Subtasks:
- Appear nested under their parent in list view
- Can have their own assignee, status, and due date
- Are independently tracked in reports and activity

---

## 10. Deleting a Task

1. Open the task detail panel.
2. Click the options menu (three dots) or **Delete** button.
3. Confirm deletion.

Who can delete:
- The task creator
- The project lead
- Organization admins and owners

Deleted tasks are permanently removed. Consider marking as **Cancelled** status instead if you want to preserve history.

---

## 11. Example PA Commands for Tasks

| What You Want | What to Say |
|---------------|-------------|
| Create a task | "Create a task: Review pull request #42, assign to me, due tomorrow" |
| Check my tasks | "What are my tasks for today?" |
| Update status | "Move 'Code review' to done" |
| Change priority | "Set 'Database migration' to urgent priority" |
| Reassign | "Assign the homepage redesign to Marcus" |
| Change due date | "Push 'User testing' to next Monday" |
| Add a comment | "Comment on 'API design': Let's use REST instead of GraphQL" |
| Flag blocker | "I'm blocked on the deployment task — CI pipeline is broken" |
| Check blockers | "What's blocked in the Mobile App project?" |

---

## Next Steps

- **[Messages & Activity Feed](./05-messages-and-activity.md)** — communicate with your team
- **[My Tasks view](./12-my-tasks.md)** — see all your tasks in one place
