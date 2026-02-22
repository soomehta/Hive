"use client";

import { ArrowDown } from "lucide-react";

interface SwarmHandoverArrowProps {
  fromName: string;
  toName: string;
  summary: string;
}

export function SwarmHandoverArrow({
  fromName,
  toName,
  summary,
}: SwarmHandoverArrowProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <div className="flex flex-col items-center">
        <ArrowDown className="size-4 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground truncate">
        <span className="font-medium">{fromName}</span>
        {" → "}
        <span className="font-medium">{toName}</span>
        {summary && `: ${summary}`}
      </p>
    </div>
  );
}
