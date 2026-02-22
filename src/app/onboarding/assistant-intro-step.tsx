"use client";

import { Bot, MessageSquare, Zap, Calendar } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

const EXAMPLE_PROMPTS = [
  {
    icon: MessageSquare,
    prompt: "Create a task to review the design mockups by Friday",
  },
  {
    icon: Zap,
    prompt: "What tasks are overdue across all my projects?",
  },
  {
    icon: Calendar,
    prompt: "Schedule a team sync for next Tuesday at 10am",
  },
];

export function AssistantIntroStep() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-violet-500/10 mb-4">
          <Bot className="size-8 text-violet-500" />
        </div>
        <h2 className="text-xl font-bold">Meet your Assistant Bee</h2>
        <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
          Your personal AI assistant that helps you manage tasks, track progress,
          and stay on top of your projects. Just type or speak naturally.
        </p>
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        <p className="text-sm font-medium text-center">Try saying...</p>
        {EXAMPLE_PROMPTS.map((example) => {
          const Icon = example.icon;
          return (
            <Card key={example.prompt} className="bg-muted/30">
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-violet-500/10 shrink-0">
                  <Icon className="size-4 text-violet-400" />
                </div>
                <p className="text-sm text-foreground italic">
                  &quot;{example.prompt}&quot;
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        For complex requests, your assistant will coordinate with specialized
        bees to get things done faster.
      </p>
    </div>
  );
}
