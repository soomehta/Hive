"use client";

import { Edit2 } from "lucide-react";
import type { SlotConfig } from "@/types/bees";

interface SlotContainerProps {
  slot: SlotConfig;
  isEditing: boolean;
  onEdit?: (slotId: string) => void;
  children: React.ReactNode;
}

export function SlotContainer({
  slot,
  isEditing,
  onEdit,
  children,
}: SlotContainerProps) {
  return (
    <div
      className="relative rounded-lg border border-border bg-card overflow-hidden"
      style={{
        gridColumn: `${slot.x + 1} / span ${slot.width}`,
        gridRow: `${slot.y + 1} / span ${slot.height}`,
      }}
    >
      {isEditing && (
        <button
          onClick={() => onEdit?.(slot.slotId)}
          className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-md bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label={`Edit ${slot.componentType} widget`}
        >
          <Edit2 className="size-3.5" />
        </button>
      )}
      <div className="h-full w-full overflow-auto">{children}</div>
    </div>
  );
}
