"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const SHORTCUTS = [
  { keys: ["⌘", "K"], description: "Open command palette" },
  { keys: ["?"], description: "Show keyboard shortcuts" },
  { keys: ["g", "d"], description: "Go to Dashboard" },
  { keys: ["g", "p"], description: "Go to Projects" },
  { keys: ["g", "t"], description: "Go to My Tasks" },
  { keys: ["n"], description: "New project / task" },
];

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Navigate quickly with these shortcuts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          {SHORTCUTS.map((s) => (
            <div
              key={s.description}
              className="flex items-center justify-between py-1.5"
            >
              <span className="text-sm text-muted-foreground">
                {s.description}
              </span>
              <div className="flex items-center gap-1">
                {s.keys.map((key, i) => (
                  <span key={i}>
                    {i > 0 && (
                      <span className="mx-0.5 text-xs text-muted-foreground">
                        then
                      </span>
                    )}
                    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
