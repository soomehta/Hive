import type { ActionTier, ActionType, AutonomyMode } from "@/types/pa";
import type { PAProfile } from "@/types/pa";

interface ActionRegistryEntry {
  defaultTier: ActionTier;
  handler: string;
  requiresIntegration?: string;
  description: string;
}

export const ACTION_REGISTRY: Record<string, ActionRegistryEntry> = {
  // Tier 1: Auto-execute (read-only queries)
  check_tasks: { defaultTier: "auto_execute", handler: "query", description: "Check task list" },
  check_calendar: { defaultTier: "auto_execute", handler: "query", description: "Check calendar", requiresIntegration: "google" },
  check_email: { defaultTier: "auto_execute", handler: "query", description: "Check emails", requiresIntegration: "google" },
  check_project_status: { defaultTier: "auto_execute", handler: "query", description: "Check project status" },
  check_workload: { defaultTier: "auto_execute", handler: "query", description: "Check team workload" },

  // Tier 2: Execute + Notify
  create_task: { defaultTier: "execute_notify", handler: "create-task", description: "Create a task" },
  update_task: { defaultTier: "execute_notify", handler: "update-task", description: "Update task" },
  complete_task: { defaultTier: "execute_notify", handler: "complete-task", description: "Mark task done" },
  create_comment: { defaultTier: "execute_notify", handler: "create-comment", description: "Add comment" },
  flag_blocker: { defaultTier: "execute_notify", handler: "flag-blocker", description: "Flag blocker" },
  calendar_block: { defaultTier: "execute_notify", handler: "calendar-block", description: "Block time", requiresIntegration: "google" },
  generate_report: { defaultTier: "execute_notify", handler: "generate-report", description: "Generate report" },
  generate_briefing: { defaultTier: "execute_notify", handler: "generate-report", description: "Generate briefing" },

  // Tier 3: Draft + Approve
  post_message: { defaultTier: "draft_approve", handler: "post-message", description: "Post message" },
  calendar_event: { defaultTier: "draft_approve", handler: "calendar-event", description: "Schedule meeting", requiresIntegration: "google" },
  calendar_reschedule: { defaultTier: "draft_approve", handler: "calendar-reschedule", description: "Reschedule meeting", requiresIntegration: "google" },
  send_email: { defaultTier: "draft_approve", handler: "send-email", description: "Send email", requiresIntegration: "google" },
  send_slack: { defaultTier: "draft_approve", handler: "send-slack", description: "Send Slack message", requiresIntegration: "slack" },
  delete_task: { defaultTier: "draft_approve", handler: "delete-task", description: "Delete a task" },
};

export function resolveActionTier(
  actionType: string,
  paProfile: PAProfile,
  context?: { assigneeId?: string; userId?: string }
): ActionTier {
  const registry = ACTION_REGISTRY[actionType];
  if (!registry) return "suggest_only";

  // 1. Check user overrides
  const overrides = (paProfile.actionOverrides ?? {}) as Record<string, ActionTier>;
  if (overrides[actionType]) {
    return overrides[actionType];
  }

  // 2. Manual mode -> always draft_approve
  if (paProfile.autonomyMode === "manual") {
    return "draft_approve";
  }

  // 3. Autopilot -> use default tier (but Tier 3+ still needs approval)
  if (paProfile.autonomyMode === "autopilot") {
    return registry.defaultTier;
  }

  // 4. Copilot (default)
  // Special rule: creating task for someone else -> bump to draft_approve
  if (
    actionType === "create_task" &&
    context?.assigneeId &&
    context.assigneeId !== context?.userId
  ) {
    return "draft_approve";
  }

  return registry.defaultTier;
}

export function getRegistryEntry(actionType: string): ActionRegistryEntry | undefined {
  return ACTION_REGISTRY[actionType];
}
