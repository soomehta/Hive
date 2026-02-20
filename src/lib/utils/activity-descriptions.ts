type ActivityType =
  | "task_created"
  | "task_updated"
  | "task_completed"
  | "task_deleted"
  | "task_assigned"
  | "task_commented"
  | "blocker_flagged"
  | "blocker_resolved"
  | "message_posted"
  | "project_created"
  | "project_updated"
  | "member_joined"
  | "member_left"
  | "pa_action_executed"
  | "pa_report_generated";

interface ActivityMetadata {
  taskTitle?: string;
  projectName?: string;
  assigneeName?: string;
  oldStatus?: string;
  newStatus?: string;
  fieldChanged?: string;
  memberName?: string;
  [key: string]: unknown;
}

export function getActivityDescription(
  type: ActivityType,
  metadata?: ActivityMetadata | null
): string {
  const m = metadata ?? {};

  switch (type) {
    case "task_created":
      return `created task "${m.taskTitle ?? "Untitled"}"`;
    case "task_updated":
      if (m.oldStatus && m.newStatus) {
        return `moved "${m.taskTitle ?? "a task"}" from ${m.oldStatus} to ${m.newStatus}`;
      }
      return `updated task "${m.taskTitle ?? "Untitled"}"`;
    case "task_completed":
      return `completed task "${m.taskTitle ?? "Untitled"}"`;
    case "task_deleted":
      return `deleted task "${m.taskTitle ?? "Untitled"}"`;
    case "task_assigned":
      return `assigned "${m.taskTitle ?? "a task"}" to ${m.assigneeName ?? "someone"}`;
    case "task_commented":
      return `commented on "${m.taskTitle ?? "a task"}"`;
    case "blocker_flagged":
      return `flagged a blocker on "${m.taskTitle ?? "a task"}"`;
    case "blocker_resolved":
      return `resolved a blocker on "${m.taskTitle ?? "a task"}"`;
    case "message_posted":
      return `posted a message in ${m.projectName ?? "a project"}`;
    case "project_created":
      return `created project "${m.projectName ?? "Untitled"}"`;
    case "project_updated":
      return `updated project "${m.projectName ?? "Untitled"}"`;
    case "member_joined":
      return `${m.memberName ?? "A member"} joined the organization`;
    case "member_left":
      return `${m.memberName ?? "A member"} left the organization`;
    case "pa_action_executed":
      return "PA executed an action";
    case "pa_report_generated":
      return "PA generated a report";
    default:
      return "performed an action";
  }
}
