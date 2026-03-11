/**
 * Environment-based feature flags for Phase 6 features.
 *
 * PRD-specified names (§17):
 *   phase6_pinboard_enabled → NEXT_PUBLIC_FF_PHASE6_PINBOARD
 *   phase6_canvas_enabled  → NEXT_PUBLIC_FF_PHASE6_CANVAS
 *   phase6_chat_enabled    → NEXT_PUBLIC_FF_PHASE6_CHAT
 *
 * Also supports legacy env var names (NEXT_PUBLIC_FF_PINBOARD, etc.)
 * for backwards compatibility.
 *
 * Defaults to true so features are enabled unless explicitly disabled.
 */

export const featureFlags = {
  /** Pinboard Home (drag-and-drop dashboard) */
  pinboard:
    (process.env.NEXT_PUBLIC_FF_PHASE6_PINBOARD ??
      process.env.NEXT_PUBLIC_FF_PINBOARD) !== "false",
  /** Canvas Pages (Tiptap editor, mentions, slash commands) */
  canvas:
    (process.env.NEXT_PUBLIC_FF_PHASE6_CANVAS ??
      process.env.NEXT_PUBLIC_FF_CANVAS) !== "false",
  /** Team Chat (channels, threads, message search) */
  chat:
    (process.env.NEXT_PUBLIC_FF_PHASE6_CHAT ??
      process.env.NEXT_PUBLIC_FF_CHAT) !== "false",
  /** Phase 7: Workspaces */
  workspaces:
    process.env.NEXT_PUBLIC_FF_PHASE7_WORKSPACES !== "false",
  /** Phase 7: Agent Channels & @Mentions */
  agentChannels:
    process.env.NEXT_PUBLIC_FF_PHASE7_AGENT_CHANNELS !== "false",
  /** Phase 7: PM Agent (standups, reports, check-ins) */
  pmAgent:
    process.env.NEXT_PUBLIC_FF_PHASE7_PM_AGENT !== "false",
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
