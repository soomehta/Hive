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

  // Phase 6: Pages, Notices, Chat
  create_page: { defaultTier: "execute_notify", handler: "create-page", description: "Create a canvas page" },
  update_page: { defaultTier: "execute_notify", handler: "update-page", description: "Update page content" },
  link_items: { defaultTier: "execute_notify", handler: "link-items", description: "Link two items together" },
  unlink_items: { defaultTier: "execute_notify", handler: "unlink-items", description: "Remove a link between items" },
  create_notice: { defaultTier: "draft_approve", handler: "create-notice", description: "Post a team notice" },
  create_channel: { defaultTier: "draft_approve", handler: "create-channel", description: "Create a chat channel" },
  post_channel_message: { defaultTier: "draft_approve", handler: "post-channel-message", description: "Post a message in a chat channel" },
  summarize_page: { defaultTier: "auto_execute", handler: "summarize-page", description: "Summarize page content" },
  convert_message_to_task: { defaultTier: "execute_notify", handler: "convert-message-to-task", description: "Convert chat message to task" },
  convert_message_to_page: { defaultTier: "execute_notify", handler: "convert-message-to-page", description: "Convert chat message to page" },

  // Phase 7: Workspaces + PM Agent
  create_workspace: { defaultTier: "draft_approve", handler: "create-workspace", description: "Create a workspace" },
  update_workspace: { defaultTier: "draft_approve", handler: "update-workspace", description: "Update workspace settings" },
  invite_workspace_member: { defaultTier: "draft_approve", handler: "invite-workspace-member", description: "Invite member to workspace" },
  generate_standup: { defaultTier: "auto_execute", handler: "generate-standup", description: "Generate daily standup" },
  generate_weekly_report: { defaultTier: "auto_execute", handler: "generate-weekly-report", description: "Generate weekly report" },
  send_checkin: { defaultTier: "auto_execute", handler: "send-checkin", description: "Send task check-in" },

  // Phase 8: Chat enhancements
  pin_message: { defaultTier: "execute_notify", handler: "pin-message", description: "Pin or unpin a chat message" },
  archive_channel: { defaultTier: "draft_approve", handler: "archive-channel", description: "Archive a chat channel" },
  search_messages: { defaultTier: "auto_execute", handler: "search-messages", description: "Search chat messages" },

  // Sprint 5: Meeting Notes extraction
  extract_tasks_from_notes: { defaultTier: "draft_approve", handler: "extract-tasks", description: "Extract tasks from meeting notes" },
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

/**
 * Normalize an AI-returned intent string to match a registry key.
 * 1. Lowercase + replace hyphens with underscores
 * 2. Exact match against ACTION_REGISTRY
 * 3. Fuzzy match (Levenshtein distance ≤ 2) for typos
 * Returns the matched key or null.
 */
export function normalizeIntent(rawIntent: string): string | null {
  if (!rawIntent) return null;

  // Step 1: normalize formatting
  const normalized = rawIntent.toLowerCase().replace(/-/g, "_").trim();

  // Step 2: exact match
  if (ACTION_REGISTRY[normalized]) return normalized;

  // Step 3: fuzzy match (Levenshtein ≤ 2)
  const keys = Object.keys(ACTION_REGISTRY);
  let bestMatch: string | null = null;
  let bestDistance = 3; // threshold + 1

  for (const key of keys) {
    const dist = levenshtein(normalized, key);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = key;
    }
  }

  return bestMatch;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Use single-row DP for space efficiency
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}
