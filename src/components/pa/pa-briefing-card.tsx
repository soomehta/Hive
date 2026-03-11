"use client";

import { useState } from "react";
import { Sun, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronRight, ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePABriefing } from "@/hooks/use-pa";

type TaskItem = { id: string; title: string; status?: string; priority?: string };

function TaskList({ tasks, emptyText }: { tasks: TaskItem[]; emptyText: string }) {
  if (tasks.length === 0) {
    return <p className="text-xs text-muted-foreground italic">{emptyText}</p>;
  }
  return (
    <ul className="space-y-1">
      {tasks.slice(0, 5).map((t) => (
        <li key={t.id} className="flex items-center gap-2 text-sm">
          <span className="size-1.5 shrink-0 rounded-full bg-current opacity-40" />
          <span className="truncate">{t.title}</span>
          {t.priority === "urgent" && (
            <Badge variant="destructive" className="h-4 px-1 text-[10px]">urgent</Badge>
          )}
        </li>
      ))}
      {tasks.length > 5 && (
        <li className="text-xs text-muted-foreground">+{tasks.length - 5} more</li>
      )}
    </ul>
  );
}

function CollapsibleSection({
  icon,
  title,
  count,
  variant = "default",
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  variant?: "default" | "warning" | "danger";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const colorMap = {
    default: "text-muted-foreground",
    warning: "text-amber-500",
    danger: "text-red-500",
  };

  return (
    <div className="rounded-lg border border-border/50 bg-background/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted/50 rounded-lg transition-colors"
      >
        {open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
        <span className={colorMap[variant]}>{icon}</span>
        <span className="flex-1 text-left">{title}</span>
        <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">{count}</Badge>
      </button>
      {open && <div className="px-3 pb-3 pt-1">{children}</div>}
    </div>
  );
}

export function PABriefingCard() {
  const { data, isLoading, error } = usePABriefing();

  if (isLoading) {
    return (
      <Card className="border-border bg-muted">
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="size-2 animate-pulse rounded-full bg-violet-400" />
            Loading briefing...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border bg-muted">
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="size-4 text-amber-500" />
            <span>Briefing unavailable right now.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasOverdue = data.overdueTasks?.length > 0;
  const hasBlockers = data.blockers?.length > 0;
  const hasTodayTasks = data.todaysTasks?.length > 0;

  return (
    <Card className="border-border bg-muted">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sun className="size-5 text-amber-400" />
            Morning Briefing
          </CardTitle>
          <div className="flex gap-1.5">
            {hasOverdue && (
              <Badge variant="outline" className="gap-1 border-red-500/30 text-red-400">
                <AlertTriangle className="size-3" />
                {data.overdueTasks.length}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1 border-border text-muted-foreground">
              <CheckCircle2 className="size-3" />
              {data.totalActiveTasks} active
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* AI summary */}
        <p className="text-sm leading-relaxed text-foreground">{data.briefing}</p>

        {/* Structured sections */}
        <div className="space-y-2">
          {hasOverdue && (
            <CollapsibleSection
              icon={<AlertTriangle className="size-3.5" />}
              title="Overdue"
              count={data.overdueTasks.length}
              variant="danger"
              defaultOpen
            >
              <TaskList tasks={data.overdueTasks} emptyText="None" />
            </CollapsibleSection>
          )}

          {hasBlockers && (
            <CollapsibleSection
              icon={<AlertTriangle className="size-3.5" />}
              title="Blocked"
              count={data.blockers.length}
              variant="warning"
              defaultOpen
            >
              <TaskList tasks={data.blockers} emptyText="None" />
            </CollapsibleSection>
          )}

          {hasTodayTasks && (
            <CollapsibleSection
              icon={<Clock className="size-3.5" />}
              title="Due Today"
              count={data.todaysTasks.length}
              defaultOpen={!hasOverdue && !hasBlockers}
            >
              <TaskList tasks={data.todaysTasks} emptyText="Nothing due today" />
            </CollapsibleSection>
          )}

          {data.weekTasks?.length > 0 && (
            <CollapsibleSection
              icon={<ListTodo className="size-3.5" />}
              title="This Week"
              count={data.weekTasks.length}
            >
              <TaskList tasks={data.weekTasks} emptyText="Nothing this week" />
            </CollapsibleSection>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
