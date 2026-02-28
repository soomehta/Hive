"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/hooks/use-org";
import {
  groupTasksByTimeframe,
  TIME_GROUP_LABELS,
  type TaskTimeGroup,
  formatDate,
} from "@/lib/utils/dates";
import { getDueDateClassName, isOverdue } from "@/components/shared/due-date-styles";
import { formatMinutes } from "@/lib/utils/user-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  AlertCircle,
  XCircle,
  CalendarDays,
  ClipboardList,
  Trash2,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";

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
          <p className={`mt-0.5 text-xs flex items-center gap-1 ${getDueDateClassName(task.dueDate)}`}>
            {isOverdue(task.dueDate) ? <AlertCircle className="size-3" /> : <CalendarDays className="size-3" />}
            {formatDate(task.dueDate)}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
      </div>
    </button>
  );
}

// ─── Task Detail Sheet ──────────────────────────────────

const TASK_STATUS_OPTIONS: { value: Task["status"]; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

const TASK_PRIORITY_OPTIONS: { value: Task["priority"]; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  onTaskUpdate,
  onTaskDelete,
  isUpdating,
  isDeleting,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdate: (taskId: string, data: Record<string, unknown>) => void;
  onTaskDelete: (taskId: string) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}) {
  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{task.title}</SheetTitle>
          <SheetDescription>Task details</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <Separator />

          {/* Status selector */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-muted-foreground">Status</Label>
            <Select
              value={task.status}
              onValueChange={(value) =>
                onTaskUpdate(task.id, { status: value })
              }
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority selector */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
            <Select
              value={task.priority}
              onValueChange={(value) =>
                onTaskUpdate(task.id, { priority: value })
              }
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due date input */}
          <div className="space-y-1.5">
            <Label
              htmlFor="my-task-due-date"
              className="text-sm font-medium text-muted-foreground"
            >
              Due Date
            </Label>
            <Input
              id="my-task-due-date"
              type="date"
              defaultValue={
                task.dueDate
                  ? new Date(task.dueDate).toISOString().split("T")[0]
                  : ""
              }
              onBlur={(e) => {
                const value = e.target.value;
                const newDate = value ? new Date(value).toISOString() : null;
                if (newDate !== task.dueDate) {
                  onTaskUpdate(task.id, { dueDate: newDate });
                }
              }}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          {/* Blocked indicator */}
          {task.isBlocked && (
            <Badge variant="destructive">Blocked</Badge>
          )}

          {/* Description */}
          {task.description && (
            <div>
              <h4 className="mb-1 text-sm font-medium text-muted-foreground">
                Description
              </h4>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* Action buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onTaskUpdate(task.id, { status: "done" })}
              disabled={task.status === "done" || isUpdating}
            >
              <CheckCircle2 className="size-4 mr-1" />
              {isUpdating ? "Saving..." : "Mark Complete"}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/projects/${task.projectId}/tasks`}>
                Open in Project
              </Link>
            </Button>
          </div>

          {/* Delete button */}
          <div className="border-t pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-start"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? "Deleting..." : "Delete Task"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete task?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &ldquo;{task.title}&rdquo;. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onTaskDelete(task.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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

  const updateMutation = useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: Record<string, unknown>;
    }) => {
      const res = await apiClient(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update task");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Show specific message when marking complete
      if (variables.data.status === "done") {
        toast.success("Task marked complete");
      } else {
        toast.success("Task updated");
      }
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      // Sync selected task state with updated fields
      setSelectedTask((prev) =>
        prev && prev.id === variables.taskId
          ? { ...prev, ...variables.data }
          : prev
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update task");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiClient(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete task");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Task deleted");
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setSheetOpen(false);
      setSelectedTask(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete task");
    },
  });

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    setSheetOpen(true);
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
        onTaskUpdate={(taskId, data) => updateMutation.mutate({ taskId, data })}
        onTaskDelete={(taskId) => deleteMutation.mutate(taskId)}
        isUpdating={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
