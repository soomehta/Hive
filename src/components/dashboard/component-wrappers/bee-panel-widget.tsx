"use client";

import type { WidgetProps } from "@/types/bees";
import { PAChat } from "@/components/pa/pa-chat";
import { Bot } from "lucide-react";

export function BeePanelWidget({ isEditing }: WidgetProps) {
  if (isEditing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
          <Bot className="h-6 w-6 text-violet-600" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-medium">Hive PA</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your AI personal assistant. Available when not editing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Widget header */}
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100">
          <Bot className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
        </div>
        <span className="text-xs font-semibold">Hive PA</span>
      </div>
      <PAChat />
    </div>
  );
}
