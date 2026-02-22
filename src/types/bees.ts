import type { InferSelectModel } from "drizzle-orm";
import type {
  beeTemplates,
  beeInstances,
  swarmSessions,
  beeRuns,
  hiveContext,
  beeHandovers,
  beeSignals,
  dashboardLayouts,
  componentRegistry,
  beeTypeEnum,
  beeSubtypeEnum,
  beeRunStatusEnum,
  swarmStatusEnum,
  handoverTypeEnum,
  signalTypeEnum,
  pathwayEnum,
  dashboardComponentTypeEnum,
} from "@/lib/db/schema";

export type BeeTemplate = InferSelectModel<typeof beeTemplates>;
export type BeeInstance = InferSelectModel<typeof beeInstances>;
export type SwarmSession = InferSelectModel<typeof swarmSessions>;
export type BeeRun = InferSelectModel<typeof beeRuns>;
export type HiveContextEntry = InferSelectModel<typeof hiveContext>;
export type BeeHandover = InferSelectModel<typeof beeHandovers>;
export type BeeSignal = InferSelectModel<typeof beeSignals>;
export type DashboardLayout = InferSelectModel<typeof dashboardLayouts>;
export type ComponentRegistryEntry = InferSelectModel<typeof componentRegistry>;

export type BeeType = (typeof beeTypeEnum.enumValues)[number];
export type BeeSubtype = (typeof beeSubtypeEnum.enumValues)[number];
export type BeeRunStatus = (typeof beeRunStatusEnum.enumValues)[number];
export type SwarmStatus = (typeof swarmStatusEnum.enumValues)[number];
export type HandoverType = (typeof handoverTypeEnum.enumValues)[number];
export type SignalType = (typeof signalTypeEnum.enumValues)[number];
export type Pathway = (typeof pathwayEnum.enumValues)[number];
export type DashboardComponentType =
  (typeof dashboardComponentTypeEnum.enumValues)[number];

export type ContextType = "output" | "handover" | "signal" | "artifact";

export interface DispatchPlan {
  mode: "direct" | "swarm";
  complexityScore: number;
  complexityReasons: string[];
  selectedBees: DispatchBee[];
  estimatedDurationMs: number;
}

export interface DispatchBee {
  beeInstanceId: string;
  templateName: string;
  type: BeeType;
  subtype: BeeSubtype;
  order: number;
  relevanceScore: number;
  reason: string;
}

export interface HandoverContract {
  from: string;
  to: string;
  type: HandoverType;
  summary: string;
  data: Record<string, unknown>;
  request: string;
  constraints: Record<string, unknown>;
}

export interface SlotConfig {
  slotId: string;
  componentType: DashboardComponentType;
  config: Record<string, unknown>;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WidgetProps {
  orgId: string;
  projectId?: string;
  config: Record<string, unknown>;
  width: number;
  height: number;
  isEditing: boolean;
}

export interface BeeToolAccess {
  tools: string[];
  restrictedActions?: string[];
}

export interface TriggerConditions {
  intents?: string[];
  keywords?: string[];
  subtypeMatch?: boolean;
}
