"use client";

import type { WidgetProps } from "@/types/bees";
import { Paperclip } from "lucide-react";

export function FilesWidget({ isEditing }: WidgetProps) {
  return (
    <div
      className={`flex h-full flex-col items-center justify-center gap-3 p-6 text-center ${
        isEditing ? "pointer-events-none select-none" : ""
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Paperclip className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Files</p>
        <p className="mt-1 text-xs text-muted-foreground">No files shared yet</p>
      </div>
      <p className="max-w-[180px] text-[11px] text-muted-foreground">
        Files attached to tasks and messages will appear here.
      </p>
    </div>
  );
}
