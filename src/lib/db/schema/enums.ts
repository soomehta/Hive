import { pgEnum } from "drizzle-orm/pg-core";

// ─── Phase 1 Enums ────────────────────────────────────────

export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "member"]);

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "paused",
  "completed",
  "archived",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "task_assigned",
  "task_completed",
  "task_overdue",
  "task_commented",
  "message_posted",
  "blocker_flagged",
  "pa_action_pending",
  "pa_briefing",
  "pa_nudge",
  "pa_report_ready",
  "member_invited",
  "project_created",
  "bee_swarm_completed",
  "bee_signal_hold",
  "bee_needs_approval",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "task_created",
  "task_updated",
  "task_completed",
  "task_deleted",
  "task_assigned",
  "task_commented",
  "blocker_flagged",
  "blocker_resolved",
  "message_posted",
  "project_created",
  "project_updated",
  "member_joined",
  "member_left",
  "pa_action_executed",
  "pa_report_generated",
  "bee_swarm_started",
  "bee_swarm_completed",
  "bee_handover",
  "bee_signal",
  "dashboard_layout_changed",
]);

// ─── Phase 2 Enums ─────────────────────────────────────

export const actionTierEnum = pgEnum("action_tier", [
  "auto_execute",
  "execute_notify",
  "draft_approve",
  "suggest_only",
]);

export const actionStatusEnum = pgEnum("action_status", [
  "pending",
  "approved",
  "rejected",
  "executed",
  "failed",
  "expired",
]);

export const actionTypeEnum = pgEnum("action_type", [
  "create_task",
  "update_task",
  "complete_task",
  "delete_task",
  "create_comment",
  "post_message",
  "flag_blocker",
  "calendar_block",
  "calendar_event",
  "calendar_reschedule",
  "send_email",
  "send_slack",
  "generate_report",
  "generate_briefing",
  "check_tasks",
  "check_calendar",
  "check_email",
  "check_project_status",
  "check_workload",
]);

export const integrationProviderEnum = pgEnum("integration_provider", [
  "google",
  "microsoft",
  "slack",
]);

export const autonomyModeEnum = pgEnum("autonomy_mode", [
  "autopilot",
  "copilot",
  "manual",
]);

export const verbosityEnum = pgEnum("verbosity", [
  "concise",
  "detailed",
  "bullet_points",
]);

export const formalityEnum = pgEnum("formality", [
  "casual",
  "professional",
  "mixed",
]);

// ─── Phase 5 Enums ────────────────────────────────────────

export const beeTypeEnum = pgEnum("bee_type", [
  "assistant",
  "admin",
  "manager",
  "operator",
]);

export const beeSubtypeEnum = pgEnum("bee_subtype", [
  "none",
  "orchestrator",
  "coordinator",
  "specialist",
  "analyst",
  "compliance",
]);

export const beeRunStatusEnum = pgEnum("bee_run_status", [
  "queued",
  "running",
  "waiting_handover",
  "waiting_signal",
  "completed",
  "failed",
  "cancelled",
]);

export const swarmStatusEnum = pgEnum("swarm_status", [
  "planning",
  "running",
  "paused",
  "completed",
  "failed",
]);

export const handoverTypeEnum = pgEnum("handover_type", [
  "sequential",
  "parallel",
  "conditional",
]);

export const signalTypeEnum = pgEnum("signal_type", [
  "hold",
  "info",
  "warning",
  "escalate",
]);

export const pathwayEnum = pgEnum("pathway", [
  "boards",
  "lists",
  "workspace",
]);

export const dashboardComponentTypeEnum = pgEnum("dashboard_component_type", [
  "board",
  "list",
  "timeline",
  "calendar",
  "activity_feed",
  "metrics_panel",
  "team_view",
  "files",
  "chat_messages",
  "bee_panel",
  "custom_widget",
]);
