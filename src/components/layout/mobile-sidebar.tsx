"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useMobileNav } from "@/hooks/use-mobile-nav";
import { SidebarContent } from "@/components/layout/sidebar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobileSidebarOrg {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
  joinedAt: Date;
}

interface MobileSidebarProps {
  orgs: MobileSidebarOrg[];
  user: { id: string; email: string; fullName: string };
}

export function MobileSidebar({ orgs, user }: MobileSidebarProps) {
  const { isOpen, close } = useMobileNav();
  const pathname = usePathname();

  // Close mobile nav whenever the route changes
  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-[85vw] max-w-64 p-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col gap-0"
      >
        {/* Visually hidden title for accessibility */}
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <SidebarContent orgs={orgs} user={user} onNavigate={close} />
      </SheetContent>
    </Sheet>
  );
}
