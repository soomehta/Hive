import type { Pathway, SlotConfig } from "@/types/bees";
import { getPreset } from "./presets";

interface LayoutResolutionInput {
  orgId: string;
  projectId?: string;
  userId?: string;
  pathway: Pathway;
  savedLayout?: {
    layoutPresetIndex: number;
    slots: unknown;
  } | null;
}

export function resolveLayout(input: LayoutResolutionInput): {
  slots: SlotConfig[];
  presetIndex: number;
  source: "user" | "project" | "org" | "preset";
} {
  // Priority: user override > project default > org default > pathway preset
  if (input.savedLayout) {
    const slots = input.savedLayout.slots as SlotConfig[];
    return {
      slots,
      presetIndex: input.savedLayout.layoutPresetIndex,
      source: input.userId ? "user" : input.projectId ? "project" : "org",
    };
  }

  // Fall back to first preset for pathway
  const preset = getPreset(input.pathway, 0);
  return {
    slots: preset.slots,
    presetIndex: 0,
    source: "preset",
  };
}
