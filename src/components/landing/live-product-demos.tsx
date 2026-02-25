"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  PauseCircle,
  Shield,
  Users,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RunStatus = "queued" | "running" | "handover" | "done";

type SwarmRun = {
  name: string;
  status: RunStatus;
  eta: string;
  color: string;
};

type SwarmStep = {
  label: string;
  detail: string;
  progress: number;
  runs: SwarmRun[];
  result?: string;
};

const CONVERSATION_DEMOS = [
  {
    prompt:
      "Audit our Q1 launch readiness: delivery status, team load, and compliance risks.",
    response:
      "Swarm started. I routed this to Analyst, Manager, and Compliance assistants.",
    result:
      "Launch readiness is 87%. Design has 3 blockers, Sarah is at 128% capacity, and privacy review needs sign-off.",
  },
  {
    prompt:
      "Can we commit to Friday? Check dependencies and propose a safe rollout plan.",
    response:
      "Running dependency and risk analysis now with handoff between specialists.",
    result:
      "Friday is possible if API migration lands by Wednesday. I drafted a two-wave rollout with rollback checks.",
  },
  {
    prompt:
      "Summarize this week: wins, blockers, and what leaders should unblock first.",
    response:
      "Compiling updates from tasks, activity feed, and unresolved policy signals.",
    result:
      "Wins: onboarding flow shipped. Blockers: QA handoff delays and analytics instrumentation gap. Priority unblock: assign release QA owner.",
  },
];

const SWARM_STEPS: SwarmStep[] = [
  {
    label: "Step 1 - Dispatch",
    detail: "Request scored as complex. Hive starts a specialist swarm.",
    progress: 20,
    runs: [
      { name: "Analyst Assistant", status: "queued", eta: "--", color: "bg-emerald-400" },
      { name: "Manager Assistant", status: "queued", eta: "--", color: "bg-blue-400" },
      { name: "Compliance Assistant", status: "queued", eta: "--", color: "bg-amber-400" },
      { name: "Coordinator Assistant", status: "queued", eta: "--", color: "bg-violet-400" },
    ],
  },
  {
    label: "Step 2 - Parallel Analysis",
    detail: "Analyst and Compliance run checks in parallel.",
    progress: 48,
    runs: [
      { name: "Analyst Assistant", status: "running", eta: "1.1s", color: "bg-emerald-400" },
      { name: "Manager Assistant", status: "queued", eta: "--", color: "bg-blue-400" },
      { name: "Compliance Assistant", status: "running", eta: "0.9s", color: "bg-amber-400" },
      { name: "Coordinator Assistant", status: "queued", eta: "--", color: "bg-violet-400" },
    ],
  },
  {
    label: "Step 3 - Handover",
    detail: "Manager receives context and evaluates workload impact.",
    progress: 72,
    runs: [
      { name: "Analyst Assistant", status: "done", eta: "1.2s", color: "bg-emerald-400" },
      { name: "Manager Assistant", status: "running", eta: "1.4s", color: "bg-blue-400" },
      { name: "Compliance Assistant", status: "done", eta: "0.8s", color: "bg-amber-400" },
      { name: "Coordinator Assistant", status: "handover", eta: "--", color: "bg-violet-400" },
    ],
  },
  {
    label: "Step 4 - Synthesis",
    detail: "Coordinator merges findings into one recommendation.",
    progress: 100,
    runs: [
      { name: "Analyst Assistant", status: "done", eta: "1.2s", color: "bg-emerald-400" },
      { name: "Manager Assistant", status: "done", eta: "1.5s", color: "bg-blue-400" },
      { name: "Compliance Assistant", status: "done", eta: "0.8s", color: "bg-amber-400" },
      { name: "Coordinator Assistant", status: "done", eta: "0.6s", color: "bg-violet-400" },
    ],
    result:
      "Recommendation ready: rebalance design QA load, run privacy sign-off before launch, and proceed with staggered release.",
  },
];

function StatusPill({ status }: { status: RunStatus }) {
  if (status === "running") {
    return (
      <Badge variant="default" className="gap-1.5 text-[10px]">
        <Loader2 className="size-3 animate-spin" />
        Running
      </Badge>
    );
  }

  if (status === "done") {
    return (
      <Badge variant="outline" className="gap-1.5 text-[10px]">
        <CheckCircle2 className="size-3 text-emerald-500" />
        Done
      </Badge>
    );
  }

  if (status === "handover") {
    return (
      <Badge variant="secondary" className="gap-1.5 text-[10px]">
        <PauseCircle className="size-3" />
        Handover
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5 text-[10px]">
      <Clock3 className="size-3" />
      Queued
    </Badge>
  );
}

export function LivePaConversationDemo() {
  const [scenarioIndex, setScenarioIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setScenarioIndex((prev) => (prev + 1) % CONVERSATION_DEMOS.length);
    }, 7000);

    return () => window.clearInterval(timer);
  }, []);

  const scenario = CONVERSATION_DEMOS[scenarioIndex];

  return (
    <Card className="overflow-hidden border-primary/20 shadow-xl shadow-primary/5 demo-float-slow">
      <CardHeader className="border-b bg-muted/50 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary">
              <Bot className="size-4 text-primary-foreground" />
            </div>
            <CardTitle className="text-sm">Hive PA - Live Demo</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
            Live cycle
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="flex justify-end demo-fade-up" key={`prompt-${scenarioIndex}`}>
          <div className="max-w-[90%] rounded-2xl rounded-br-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            {scenario.prompt}
          </div>
        </div>

        <div className="flex justify-start demo-fade-up" key={`response-${scenarioIndex}`}>
          <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-muted px-4 py-2 text-sm">
            {scenario.response}
          </div>
        </div>

        <div className="mx-4 grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-xs demo-fade-up">
          <div className="rounded-md border bg-background px-2 py-1.5 text-center">
            <Wrench className="mx-auto mb-1 size-3.5 text-emerald-500" />
            Analyst
          </div>
          <div className="rounded-md border bg-background px-2 py-1.5 text-center">
            <Users className="mx-auto mb-1 size-3.5 text-blue-500" />
            Manager
          </div>
          <div className="rounded-md border bg-background px-2 py-1.5 text-center">
            <Shield className="mx-auto mb-1 size-3.5 text-amber-500" />
            Compliance
          </div>
        </div>

        <div className="flex justify-start demo-fade-up" key={`result-${scenarioIndex}`}>
          <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-muted px-4 py-2 text-sm">
            {scenario.result}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 pt-1">
          {CONVERSATION_DEMOS.map((demo, index) => (
            <span
              key={demo.prompt}
              className={cn(
                "h-1.5 w-5 rounded-full transition-colors",
                index === scenarioIndex ? "bg-primary" : "bg-border",
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function LiveBeeSwarmDemo() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % SWARM_STEPS.length);
    }, 1800);

    return () => window.clearInterval(timer);
  }, []);

  const step = SWARM_STEPS[stepIndex];

  const eventLines = useMemo(
    () =>
      step.runs
        .filter((run) => run.status !== "queued")
        .map((run) => `${run.name} ${run.status === "done" ? "completed" : "running"}`),
    [step],
  );

  return (
    <Card className="border-primary/20 shadow-lg shadow-primary/5">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">Live Bee Swarm Operation</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{step.label}</p>
        </div>
        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
          Auto cycling
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{step.detail}</span>
            <span>{step.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-700"
              style={{ width: `${step.progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {step.runs.map((run) => (
            <div
              key={run.name}
              className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm demo-fade-up"
            >
              <div className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full demo-pulse-dot", run.color)} />
                <span>{run.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{run.eta}</span>
                <StatusPill status={run.status} />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-md border bg-muted/40 px-3 py-2">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Event stream
          </p>
          {eventLines.length === 0 ? (
            <p className="text-xs text-muted-foreground">Waiting for first runs to start...</p>
          ) : (
            <div className="space-y-1">
              {eventLines.map((line) => (
                <p key={line} className="text-xs text-muted-foreground">
                  <Check className="mr-1 inline size-3 text-emerald-500" />
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>

        {step.result ? (
          <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground demo-fade-up">
            Result: {step.result}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
