"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MainContent } from "@/components/layout/main-content";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { PAChatOverlay } from "@/components/pa/pa-chat-overlay";
import { CanvasSidebar } from "@/components/layout/canvas-sidebar";

// ---------------------------------------------------------------------------
// DashboardShell
//
// Conditionally renders the canvas layout (on /dashboard) or the traditional
// sidebar + header + main-content layout (on all sub-routes).
//
// Canvas mode: no header, no sidebar (just floating Hive icon), no overlay.
// The CanvasPAChat inside CanvasRoot is the sole chat interface.
//
// Sub-route mode: traditional sidebar + header + PAChatOverlay (Cmd+J).
// ---------------------------------------------------------------------------

interface DashboardShellProps {
  orgs: Array<{
    id: string;
    name: string;
    slug: string;
    role: "owner" | "admin" | "member";
    joinedAt: Date;
  }>;
  user: { id: string; email: string; fullName: string };
  children: React.ReactNode;
}

export function DashboardShell({ orgs, user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const isCanvasMode = pathname === "/dashboard";

  if (isCanvasMode) {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-background">
        <CanvasSidebar orgs={orgs} user={user} />
        <main id="main-content" className="h-full w-full">
          {children}
        </main>
      </div>
    );
  }

  // Traditional layout for sub-routes
  return (
    <div className="flex h-screen">
      <Sidebar orgs={orgs} user={user} />
      <MobileSidebar orgs={orgs} user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <MainContent>{children}</MainContent>
      </div>
      <PAChatOverlay />
    </div>
  );
}
