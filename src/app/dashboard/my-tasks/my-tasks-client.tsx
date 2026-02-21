"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/hooks/use-org";
import {
  groupTasksByTimeframe,
  TIME_GROUP_LABELS,
  type TaskTimeGroup,
  formatDate,
} from "@/lib/utils/dates";
import { formatMinutes } from "@/lib/utils/user-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  XCircle,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

// ─── Types ──────────────────────────────────────────────

interface Task {
  id: string;
  projectId: string;
  orgId: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "in_review" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  assigneeId: string | null;
  createdBy: string;
  dueDate: string | null;
  completedAt: string | null;
  estimatedMinutes: number | null;
  position: number;
  isBlocked: boolean;
  blockedReason: string | null;
  parentTaskId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Priority Badge ─────────────────────────────────────

const PRIORITY_CONFIG: Record<
  Task["priority"],
  { label: string; className: string }
> = {
  urgent: {
    label: "Urgent",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
  high: {
    label: "High",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  },
  medium: {
    label: "Medium",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  },
  low: {
    label: "Low",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  },
};

function PriorityBadge({ priority }: { priority: Task["priority"] }) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

// ─── Status Badge ───────────────────────────────────────

const STATUS_CONFIG: Record<
  Task["status"],
  { label: string; className: string; icon: React.ReactNode }
> = {
  todo: {
    label: "To Do",
    className:
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    icon: <Circle className="size-3" />,
  },
  in_progress: {
    label: "In Progress",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    icon: <Clock className="size-3" />,
  },
  in_review: {
    label: "In Review",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
    icon: <AlertTriangle className="size-3" />,
  },
  done: {
    label: "Done",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    icon: <CheckCircle2 className="size-3" />,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    icon: <XCircle className="size-3" />,
  },
};

function StatusBadge({ status }: { status: Task["status"] }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

// ─── Time Group Section ─────────────────────────────────

const TIME_GROUP_COLORS: Record<TaskTimeGroup, string> = {
  overdue: "text-red-600 dark:text-red-400",
  today: "text-blue-600 dark:text-blue-400",
  tomorrow: "text-amber-600 dark:text-amber-400",
  this_week: "text-foreground",
  later: "text-muted-foreground",
  no_date: "text-muted-foreground",
};

function TimeGroupSection({
  group,
  tasks,
  onSelectTask,
}: {
  group: TaskTimeGroup;
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3
          className={`text-sm font-semibold ${TIME_GROUP_COLORS[group]}`}
        >
          {TIME_GROUP_LABELS[group]}
        </h3>
        <span className="text-xs text-muted-foreground">
          ({tasks.length})
        </span>
      </div>
      <div className="space-y-1">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onClick={() => onSelectTask(task)} />
        ))}
      </div>
    </div>
  );
}

// ─── Task Row ───────────────────────────────────────────

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{task.title}</p>
        {task.dueDate && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            <CalendarDays className="mr-1 inline size-3" />
            {formatDate(task.dueDate)}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
      </div>
    </button>
  );
}

// ─── Task Detail Sheet ──────────────────────────────────

function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  onMarkComplete,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkComplete: (task: Task) => Promise<void>;
}) {
  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{task.title}</SheetTitle>
          <SheetDescription>Task details</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <div className="flex flex-wrap gap-2">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
            {task.isBlocked && (
              <Badge variant="destructive">Blocked</Badge>
            )}
          </div>

          <Separator />

          {task.description && (
            <div>
              <h4 className="mb-1 text-sm font-medium text-muted-foreground">
                Description
              </h4>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {task.dueDate && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">
                  Due Date
                </h4>
                <p className="text-sm">{formatDate(task.dueDate)}</p>
              </div>
            )}

            {task.estimatedMinutes && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">
                  Estimate
                </h4>
                <p className="text-sm">{formatMinutes(task.estimatedMinutes)}</p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-muted-foreground">
                Created
              </h4>
              <p className="text-sm">{formatDate(task.createdAt)}</p>
            </div>

            {task.completedAt && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">
                  Completed
                </h4>
                <p className="text-sm">{formatDate(task.completedAt)}</p>
              </div>
            )}
          </div>

          {task.isBlocked && task.blockedReason && (
            <div>
              <h4 className="mb-1 text-sm font-medium text-red-600">
                Blocked Reason
              </h4>
              <p className="text-sm">{task.blockedReason}</p>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMarkComplete(task)}
              disabled={task.status === "done"}
            >
              <CheckCircle2 className="size-4 mr-1" />
              Mark Complete
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/projects/${task.projectId}/tasks`}>
                Open in Project
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Loading Skeleton ───────────────────────────────────

function MyTasksSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((group) => (
        <div key={group} className="space-y-2">
          <Skeleton className="h-5 w-24" />
          {[1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────

const TIME_GROUP_ORDER: TaskTimeGroup[] = [
  "overdue",
  "today",
  "tomorrow",
  "this_week",
  "later",
  "no_date",
];

export function PageClient() {
  const { orgId } = useOrg();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const supabase = createClient();

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });

  const userId = user?.id;

  const {
    data: tasksData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["my-tasks", orgId, userId],
    queryFn: async () => {
      const res = await apiClient(
        `/api/tasks?assigneeId=${userId}&limit=100`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch tasks");
      }
      const json = await res.json();
      return json.data as Task[];
    },
    enabled: !!orgId && !!userId,
  });

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    setSheetOpen(true);
  };

  const handleMarkComplete = async (task: Task) => {
    await apiClient(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "done" }),
    });
    queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    setSheetOpen(false);
    setSelectedTask(null);
  };

  if (isLoading || !user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground">
            Tasks assigned to you across all projects
          </p>
        </div>
        <MyTasksSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground">
            Tasks assigned to you across all projects
          </p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load tasks. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const tasks = tasksData ?? [];
  const grouped = groupTasksByTimeframe(tasks);
  const hasAnyTasks = tasks.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">
          Tasks assigned to you across all projects
        </p>
      </div>

      {!hasAnyTasks ? (
        <div className="rounded-lg border border-dashed">
          <EmptyState
            icon={<ClipboardList />}
            title="No tasks assigned"
            description="You don't have any tasks assigned to you yet."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {TIME_GROUP_ORDER.map((group) => (
            <TimeGroupSection
              key={group}
              group={group}
              tasks={grouped[group]}
              onSelectTask={handleSelectTask}
            />
          ))}
        </div>
      )}

      <TaskDetailSheet
        task={selectedTask}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onMarkComplete={handleMarkComplete}
      />
    </div>
  );
}
