# Projects

Projects are the top-level containers for your work in Hive. Every task, message, and activity belongs to a project. This guide covers creating, managing, and collaborating on projects.

---

## 1. Viewing Your Projects

1. Click **Projects** in the sidebar.
2. You'll see a grid of **project cards**, each showing:
   - Project name and color badge
   - Status (Active, Paused, Completed, Archived)
   - Description snippet
   - Target date (if set)
   - Number of members
3. Click any card to open that project.

### Filtering Projects

- Projects are filtered to your current organization automatically.
- Only projects you are a member of are visible to you.

---

## 2. Creating a New Project

### From the UI

1. Click **Projects** in the sidebar.
2. Click the **New Project** button (top-right of the page).
3. Fill out the form:
   - **Name** (required) — a clear, descriptive name (e.g., "Website Redesign Q1")
   - **Description** (optional) — what the project is about; helps your PA provide context in reports
   - **Color** (optional) — pick a hex color for the project badge (e.g., `#3B82F6` for blue)
   - **Start Date** (optional) — when work begins
   - **Target Date** (optional) — the deadline or target completion date
   - **Initial Members** (optional) — select team members to add right away
4. Click **Create Project**.

### Using Your PA

You can also ask your PA to create a project:

> "Create a new project called Website Redesign with a target date of March 31"

The PA will create the project and confirm.

### What Happens When a Project Is Created

- You are automatically added as the **Project Lead**
- Any members you selected are added as **Members**
- An activity log entry (`project_created`) is recorded
- The project name and description are embedded for search/reporting

---

## 3. Project Overview Page

Click into any project to see its overview page. It has three tabs:

### Overview Tab
- **Status breakdown** — a mini chart showing task counts by status (Todo, In Progress, In Review, Done)
- **Recent activity** — latest actions within this project
- **Blockers** — any tasks currently flagged as blocked

### Tasks Tab
- Displays tasks in either **Kanban board** or **list view** (toggle in the top-right)
- Full details in the [Tasks guide](./04-tasks.md)

### Messages Tab
- Project message board for async team communication
- Full details in the [Messages guide](./05-messages-and-activity.md)

---

## 4. Editing a Project

1. Open the project.
2. Click the project name or the **edit icon** in the project header.
3. You can update:
   - Name and description
   - Status (Active, Paused, Completed, Archived)
   - Color
   - Start and target dates
4. Click **Save**.

### Using Your PA

> "Change the target date on Website Redesign to April 15"
> "Mark the Q4 Planning project as completed"

---

## 5. Managing Project Members

### Viewing Members

1. Open the project.
2. Click the member avatars in the project header, or find the members section.
3. You'll see each member's name, role (Lead or Member), and avatar.

### Adding Members

1. In the project, click **Add Member** or the "+" icon in the members area.
2. Select a team member from your organization.
3. They are added as a **Member** by default.

Only organization members can be added to projects. If someone isn't in the org yet, [invite them first](./13-team-and-workload.md).

### Removing Members

1. In the members list, click the options menu next to a member.
2. Click **Remove from Project**.
3. Their tasks in the project are not deleted — they become unassigned.

### Roles

- **Lead** — can manage the project, edit settings, and assign tasks to anyone. The creator is automatically the lead.
- **Member** — can create tasks, post messages, and comment. Can only assign tasks if they have the right org-level permissions.

---

## 6. Project Statuses

| Status | Meaning |
|--------|---------|
| **Active** | Work is in progress. This is the default. |
| **Paused** | Work is temporarily on hold. Tasks remain but the project won't appear in active reports. |
| **Completed** | All work is done. The project moves to a completed state. |
| **Archived** | No longer relevant. Hidden from default views but data is preserved. |

To change status, edit the project (see section 4) or ask your PA:

> "Pause the Marketing Campaign project"
> "Archive the Old Website project"

---

## 7. Deleting a Project

Deleting a project permanently removes it and all its tasks, messages, and activity. This is irreversible.

1. Open the project settings or edit view.
2. Click **Delete Project** at the bottom.
3. Confirm the deletion.

Only **Org Owners** and **Admins** can delete projects. Consider archiving instead.

---

## 8. Example PA Commands for Projects

| What You Want | What to Say |
|---------------|-------------|
| Create a project | "Create a project called Q2 Launch with a deadline of June 30" |
| Check project status | "How's the Website Redesign project going?" |
| Add a member | "Add Sarah to the Mobile App project" |
| Change deadline | "Move the Website Redesign deadline to April 1" |
| Pause a project | "Pause the Research project" |

---

## Next Steps

- **[Create and manage tasks](./04-tasks.md)** within your project
- **[Post messages](./05-messages-and-activity.md)** to communicate with your team
