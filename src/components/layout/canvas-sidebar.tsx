"use client";

import { useState, useEffect, useRef } from "react";
import { Hexagon, X } from "lucide-react";
import { useCanvasStore } from "@/hooks/use-canvas-store";
import { SidebarContent } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// CanvasSidebar
//
// In canvas mode the sidebar is collapsed to a single Hive icon in the
// top-left corner. Clicking it opens the full sidebar as a floating overlay
// panel on the left side of the screen.
// ---------------------------------------------------------------------------

interface CanvasSidebarProps {
  orgs: Array<{
    id: string;
    name: string;
    slug: string;
    role: "owner" | "admin" | "member";
    joinedAt: Date;
  }>;
  user: { id: string; email: string; fullName: string };
}

export function CanvasSidebar({ orgs, user }: CanvasSidebarProps) {
  const sidebarOpen = useCanvasStore((s) => s.sidebarOpen);
  const toggleSidebar = useCanvasStore((s) => s.toggleSidebar);

  // Close sidebar on Escape
  useEffect(() => {
    if (!sidebarOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        useCanvasStore.getState().toggleSidebar();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  return (
    <>
      {/* Hive icon — always visible in canvas mode */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "fixed left-4 top-4 z-50 flex size-10 items-center justify-center rounded-2xl transition-all duration-200",
          sidebarOpen
            ? "opacity-0 pointer-events-none"
            : "neu-flat bg-background hover:scale-105"
        )}
        aria-label="Open sidebar"
      >
        <Hexagon className="size-5 text-muted-foreground" />
      </button>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar overlay */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-[72px] flex-col bg-background/95 backdrop-blur-sm shadow-xl transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent
          orgs={orgs}
          user={user}
          onNavigate={toggleSidebar}
        />
      </aside>
    </>
  );
}
