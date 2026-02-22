"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPresets } from "@/lib/dashboard/presets";
import type { Pathway } from "@/types/bees";

interface LayoutCyclerProps {
  pathway: Pathway;
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export function LayoutCycler({
  pathway,
  currentIndex,
  onIndexChange,
}: LayoutCyclerProps) {
  const presets = getPresets(pathway);
  const current = presets[currentIndex];

  function handlePrev() {
    onIndexChange(
      currentIndex === 0 ? presets.length - 1 : currentIndex - 1
    );
  }

  function handleNext() {
    onIndexChange(
      currentIndex === presets.length - 1 ? 0 : currentIndex + 1
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={handlePrev} className="size-8">
        <ChevronLeft className="size-4" />
      </Button>
      <div className="text-center min-w-[140px]">
        <p className="text-sm font-medium">{current?.name}</p>
        <p className="text-xs text-muted-foreground">
          {currentIndex + 1} / {presets.length}
        </p>
      </div>
      <Button variant="ghost" size="icon" onClick={handleNext} className="size-8">
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
