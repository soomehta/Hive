import type { InferSelectModel } from "drizzle-orm";
import type {
  paProfiles,
  paConversations,
  paActions,
  paCorrections,
  voiceTranscripts,
  actionTypeEnum,
  actionTierEnum,
  actionStatusEnum,
  autonomyModeEnum,
} from "@/lib/db/schema";

export type PAProfile = InferSelectModel<typeof paProfiles>;
export type PAConversation = InferSelectModel<typeof paConversations>;
export type PAAction = InferSelectModel<typeof paActions>;
export type PACorrection = InferSelectModel<typeof paCorrections>;
export type VoiceTranscript = InferSelectModel<typeof voiceTranscripts>;

export type ActionType = (typeof actionTypeEnum.enumValues)[number];
export type ActionTier = (typeof actionTierEnum.enumValues)[number];
export type ActionStatus = (typeof actionStatusEnum.enumValues)[number];
export type AutonomyMode = (typeof autonomyModeEnum.enumValues)[number];
