"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LayoutDashboard, List, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Pathway } from "@/types/bees";

interface PathwayStepProps {
  selected: Pathway | null;
  onSelect: (pathway: Pathway) => void;
}

const PATHWAYS: Array<{
  value: Pathway;
  title: string;
  description: string;
  icon: React.ElementType;
  features: string[];
}> = [
  {
    value: "boards",
    title: "Boards",
    description: "Simple and visual. Great for solo work or small teams.",
    icon: LayoutDashboard,
    features: [
      "Kanban board",
      "Calendar view",
      "Activity feed",
      "AI assistant",
    ],
  },
  {
    value: "lists",
    title: "Lists & Timelines",
    description: "Balanced view with deadlines. Perfect for teams with schedules.",
    icon: List,
    features: [
      "Everything in Boards, plus:",
      "Task list with sorting",
      "Timeline / Gantt view",
    ],
  },
  {
    value: "workspace",
    title: "Full Workspace",
    description: "Complete control over your dashboard. Every widget available.",
    icon: Columns3,
    features: [
      "Everything in Lists, plus:",
      "Files & documents",
      "Team chat",
      "Multi-slot layouts",
    ],
  },
];

export function PathwayStep({ selected, onSelect }: PathwayStepProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Choose your workflow</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Pick the complexity level that fits your team. You can change this later.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PATHWAYS.map((pathway) => {
          const Icon = pathway.icon;
          const isSelected = selected === pathway.value;

          return (
            <Card
              key={pathway.value}
              className={cn(
                "cursor-pointer transition-all hover:border-violet-500/50",
                isSelected && "border-violet-500 ring-2 ring-violet-500/20"
              )}
              onClick={() => onSelect(pathway.value)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg",
                      isSelected
                        ? "bg-violet-500/10 text-violet-500"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{pathway.title}</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  {pathway.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {pathway.features.map((feature) => (
                    <li
                      key={feature}
                      className="text-xs text-muted-foreground flex items-center gap-1.5"
                    >
                      <span className="size-1 rounded-full bg-muted-foreground/50 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
