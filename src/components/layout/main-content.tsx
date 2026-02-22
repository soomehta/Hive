"use client";

import { cn } from "@/lib/utils";
import { usePAStore } from "@/hooks/use-pa";

export function MainContent({ children }: { children: React.ReactNode }) {
  const { isOpen } = usePAStore();

  return (
    <main
      id="main-content"
      className={cn(
        "flex-1 overflow-y-auto p-6 transition-[padding] duration-300",
        isOpen && "lg:pr-[416px]"
      )}
    >
      {children}
    </main>
  );
}
