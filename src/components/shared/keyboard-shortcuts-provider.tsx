"use client";

import { useState } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsDialog } from "@/components/shared/keyboard-shortcuts-dialog";

export function KeyboardShortcutsProvider() {
  const [open, setOpen] = useState(false);

  useKeyboardShortcuts({
    onOpenShortcuts: () => setOpen(true),
  });

  return <KeyboardShortcutsDialog open={open} onOpenChange={setOpen} />;
}
