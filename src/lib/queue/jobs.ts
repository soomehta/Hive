// ─── Job Type Definitions ───────────────────────────────
// Each interface defines the data payload for a specific BullMQ queue.

export interface TranscriptionJob {
  /** R2 URL or signed URL pointing to the audio file */
  audioUrl: string;
  /** Clerk user ID of the speaker */
  userId: string;
  /** Organization UUID */
  orgId: string;
  /** MIME type / audio format, e.g. "audio/webm" */
  format: string;
}

export interface AIProcessingJob {
  /** Raw transcript text from STT */
  transcript: string;
  /** Clerk user ID */
  userId: string;
  /** Organization UUID */
  orgId: string;
  /** Optional voice transcript row ID for back-reference */
  voiceTranscriptId?: string;
}

export interface ActionExecutionJob {
  /** PA action UUID to execute */
  actionId: string;
  /** Clerk user ID who owns the action */
  userId: string;
  /** Organization UUID */
  orgId: string;
}

export interface EmbeddingJob {
  /** Organization UUID */
  orgId: string;
  /** Source entity type, e.g. "task", "message", "activity" */
  sourceType: string;
  /** Source entity UUID */
  sourceId: string;
  /** Text content to embed */
  content: string;
}

export interface NotificationJob {
  /** Target Clerk user ID */
  userId: string;
  /** Organization UUID */
  orgId: string;
  /** Notification type matching the notification_type enum */
  type: string;
  /** Notification title */
  title: string;
  /** Optional notification body */
  body?: string;
  /** Delivery channel: defaults to "in_app" */
  channel?: "in_app" | "email" | "slack";
  /** Extra metadata attached to the notification */
  metadata?: Record<string, any>;
}

export interface BriefingJob {
  /** Clerk user ID to generate briefing for */
  userId: string;
  /** Organization UUID */
  orgId: string;
}

export interface DigestJob {
  /** Clerk user ID to generate digest for */
  userId: string;
  /** Organization UUID */
  orgId: string;
}

export interface LearningJob {
  /** Clerk user ID */
  userId: string;
  /** Organization UUID */
  orgId: string;
  /** The classified intent, e.g. "create_task" */
  intent: string;
  /** The PA action type that was executed */
  actionType: string;
  /** Whether the user approved the action */
  wasApproved: boolean;
  /** Whether the user edited the planned payload before approval */
  wasEdited: boolean;
}

export interface SwarmExecutionJob {
  /** Pre-created swarm session UUID — the session row already exists when this job is enqueued */
  swarmSessionId: string;
  /** Clerk user ID who triggered the swarm */
  userId: string;
  /** Organization UUID */
  orgId: string;
  /** Original PA chat message that triggered swarm dispatch */
  triggerMessage: string;
  /** Full dispatch plan (bees, phases, complexity score) serialised as JSON */
  dispatchPlan: import("@/types/bees").DispatchPlan;
  /** PA profile verbosity setting, forwarded to the synthesis prompt */
  verbosity: string;
  /** PA profile formality setting, forwarded to the synthesis prompt */
  formality: string;
}
