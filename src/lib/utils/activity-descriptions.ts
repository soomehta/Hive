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
  | "pa_report_generated"
  | "bee_swarm_started"
  | "bee_swarm_completed"
  | "bee_handover"
  | "bee_signal"
  | "dashboard_layout_changed"
  | "page_created"
  | "page_updated"
  | "page_restored"
  | "notice_created"
  | "notice_updated"
  | "notice_pinned"
  | "notice_archived"
  | "channel_created"
  | "channel_updated"
  | "channel_message_posted"
  | "channel_message_edited"
  | "channel_message_deleted"
  | "member_added_to_channel"
  | "member_removed_from_channel"
  | "item_created"
  | "item_updated"
  | "item_deleted"
  | "item_linked"
  | "item_unlinked"
  | "message_converted_to_task"
  | "message_converted_to_page"
  // Phase 7
  | "workspace_created"
  | "workspace_updated"
  | "workspace_member_added"
  | "workspace_member_removed"
  | "agent_checkin_sent"
  | "agent_checkin_responded"
  | "agent_report_generated"
  | "agent_mention_responded";

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
    case "bee_swarm_started":
      return "Bee swarm started processing";
    case "bee_swarm_completed":
      return "Bee swarm completed";
    case "bee_handover":
      return "Bee handover occurred";
    case "bee_signal":
      return "Bee signal emitted";
    case "dashboard_layout_changed":
      return "Dashboard layout was changed";
    case "page_created":
      if (m.source === "task" && m.taskTitle) {
        return `opened task "${m.taskTitle}" as a page`;
      }
      if (m.source === "project" && m.projectName) {
        return `opened project "${m.projectName}" as a page`;
      }
      return "created a page";
    case "page_updated":
      return "updated a page";
    case "page_restored":
      return "restored a page to a previous revision";
    case "notice_created":
      return `created notice "${m.title ?? "Untitled"}"`;
    case "notice_updated":
      return `updated notice "${m.title ?? "Untitled"}"`;
    case "notice_pinned":
      return `pinned notice "${m.title ?? "Untitled"}"`;
    case "notice_archived":
      return `archived notice "${m.title ?? "Untitled"}"`;
    case "channel_created":
      return `created channel "${m.channelName ?? "Untitled"}"`;
    case "channel_updated":
      return `updated channel "${m.channelName ?? "Untitled"}"`;
    case "channel_message_posted":
      return "posted a message in a channel";
    case "channel_message_edited":
      return "edited a channel message";
    case "channel_message_deleted":
      return "deleted a channel message";
    case "member_added_to_channel":
      return `added ${m.memberName ?? "a member"} to a channel`;
    case "member_removed_from_channel":
      return `removed ${m.memberName ?? "a member"} from a channel`;
    case "item_created":
      return `created a ${m.itemType ?? "item"}`;
    case "item_updated":
      return `updated a ${m.itemType ?? "item"}`;
    case "item_deleted":
      return `deleted a ${m.itemType ?? "item"}`;
    case "item_linked":
      return "linked two items";
    case "item_unlinked":
      return "unlinked two items";
    case "message_converted_to_task":
      return "converted a message to a task";
    case "message_converted_to_page":
      return "converted a message to a page";
    // Phase 7: Workspaces + Agents
    case "workspace_created":
      return `created workspace "${m.workspaceName ?? "Untitled"}"`;
    case "workspace_updated":
      return `updated workspace "${m.workspaceName ?? "Untitled"}"`;
    case "workspace_member_added":
      return `added ${m.memberName ?? "a member"} to workspace`;
    case "workspace_member_removed":
      return `removed ${m.memberName ?? "a member"} from workspace`;
    case "agent_checkin_sent":
      return `sent a check-in for "${m.taskTitle ?? "a task"}"`;
    case "agent_checkin_responded":
      return `responded to a check-in for "${m.taskTitle ?? "a task"}"`;
    case "agent_report_generated":
      return `generated a ${m.reportType ?? "report"}`;
    case "agent_mention_responded":
      return "agent responded to a mention";
    default:
      return "performed an action";
  }
}
