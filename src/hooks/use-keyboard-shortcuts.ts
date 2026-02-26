"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts({
  onOpenShortcuts,
}: {
  onOpenShortcuts: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const gPending = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearG = useCallback(() => {
    gPending.current = false;
    if (gTimer.current) {
      clearTimeout(gTimer.current);
      gTimer.current = null;
    }
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isInputFocused()) return;
      // Cmd+K is handled by command palette
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // ? — open shortcuts dialog
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        onOpenShortcuts();
        clearG();
        return;
      }

      // Handle "g then X" sequences
      if (gPending.current) {
        clearG();
        switch (e.key) {
          case "d":
            e.preventDefault();
            router.push("/dashboard");
            return;
          case "p":
            e.preventDefault();
            router.push("/dashboard/projects");
            return;
          case "t":
            e.preventDefault();
            router.push("/dashboard/my-tasks");
            return;
        }
        return;
      }

      if (e.key === "g") {
        gPending.current = true;
        gTimer.current = setTimeout(clearG, 800);
        return;
      }

      // "n" — context-dependent new
      if (e.key === "n") {
        if (pathname.includes("/tasks")) {
          // Let tasks page handle "n" for quick-add
          return;
        }
        if (
          pathname === "/dashboard/projects" ||
          pathname.startsWith("/dashboard/projects")
        ) {
          e.preventDefault();
          router.push("/dashboard/projects/new");
          return;
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      clearG();
    };
  }, [router, pathname, onOpenShortcuts, clearG]);
}
