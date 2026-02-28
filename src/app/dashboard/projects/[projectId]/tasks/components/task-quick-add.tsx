"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TaskQuickAddProps {
  columnStatus: string;
  activeColumn: string | null;
  title: string;
  onActivate: (column: string) => void;
  onTitleChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TaskQuickAdd({
  columnStatus,
  activeColumn,
  title,
  onActivate,
  onTitleChange,
  onConfirm,
  onCancel,
}: TaskQuickAddProps) {
  const isActive = activeColumn === columnStatus;

  if (isActive) {
    return (
      <Input
        autoFocus
        placeholder="Task title..."
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            onConfirm();
          }
          if (e.key === "Escape") {
            onCancel();
          }
        }}
        onBlur={onCancel}
        className="h-8 text-sm"
      />
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-muted-foreground text-xs"
      onClick={() => onActivate(columnStatus)}
    >
      <Plus className="h-3 w-3 mr-1" />
      Add task
    </Button>
  );
}
