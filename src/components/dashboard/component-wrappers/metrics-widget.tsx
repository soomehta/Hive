"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WidgetProps } from "@/types/bees";
import type { Task } from "@/types";
import { BarChart3, CheckCircle2, Clock, AlertTriangle, Loader2 } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  sub?: string;
  progressPct?: number;
  progressColor?: string;
}

function MetricCard({ label, value, icon: Icon, iconColor, sub, progressPct, progressColor }: MetricCardProps) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-xl font-bold leading-tight">{value}</p>
            {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
          </div>
          <div className={`rounded-md bg-muted p-1.5 ${iconColor}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
        {typeof progressPct === "number" && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${progressColor ?? "bg-blue-500"}`}
              style={{ width: `${Math.min(progressPct, 100)}%` }}
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MetricsWidget({ orgId, projectId, isEditing }: WidgetProps) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["widget-tasks-metrics", orgId, projectId],
    queryFn: async () => {
      const url = projectId
        ? `/api/tasks?projectId=${projectId}`
        : `/api/tasks`;
      const res = await apiClient(url);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return json.data as Task[];
    },
    enabled: !!orgId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 p-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  const total = tasks?.length ?? 0;
  const done = tasks?.filter((t) => t.status === "done").length ?? 0;
  const inProgress = tasks?.filter((t) => t.status === "in_progress").length ?? 0;
  const now = new Date();
  const overdue =
    tasks?.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== "done" &&
        t.status !== "cancelled"
    ).length ?? 0;
  const completedPct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className={`grid h-full grid-cols-2 content-start gap-2 p-3 ${isEditing ? "pointer-events-none select-none" : ""}`}>
      <MetricCard
        label="Total Tasks"
        value={total}
        icon={BarChart3}
        iconColor="text-blue-500"
        sub={projectId ? "in project" : "across org"}
      />
      <MetricCard
        label="Completed"
        value={`${completedPct}%`}
        icon={CheckCircle2}
        iconColor="text-green-500"
        sub={`${done} of ${total}`}
        progressPct={completedPct}
        progressColor="bg-green-500"
      />
      <MetricCard
        label="In Progress"
        value={inProgress}
        icon={Loader2}
        iconColor="text-amber-500"
        sub={total > 0 ? `${Math.round((inProgress / total) * 100)}% of tasks` : undefined}
        progressPct={total > 0 ? Math.round((inProgress / total) * 100) : 0}
        progressColor="bg-amber-500"
      />
      <MetricCard
        label="Overdue"
        value={overdue}
        icon={overdue > 0 ? AlertTriangle : Clock}
        iconColor={overdue > 0 ? "text-red-500" : "text-muted-foreground"}
        sub={overdue > 0 ? "need attention" : "none overdue"}
        progressPct={total > 0 ? Math.round((overdue / total) * 100) : 0}
        progressColor="bg-red-500"
      />
    </div>
  );
}
