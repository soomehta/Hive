"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
import { createTaskSchema } from "@/lib/utils/validation";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from "@/lib/utils/constants";
import { formatDate } from "@/lib/utils/dates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Plus,
  List,
  LayoutGrid,
  Filter,
  GripVertical,
} from "lucide-react";
import type { Task } from "@/types";

type TaskFormValues = z.infer<typeof createTaskSchema>;

const STATUS_COLUMN_COLORS: Record<string, string> = {
  todo: "border-t-gray-400",
  in_progress: "border-t-blue-500",
  in_review: "border-t-purple-500",
  done: "border-t-green-500",
  cancelled: "border-t-red-400",
};

const PRIORITY_DOT_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

export default function ProjectTasksPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { orgId } = useOrg();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);

  const {
    data: tasks,
    isLoading,
  } = useQuery({
    queryKey: ["project-tasks", projectId, orgId],
    queryFn: async () => {
      const res = await apiClient(`/api/tasks?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return json.data as Task[];
    },
    enabled: !!orgId && !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      const res = await apiClient("/api/tasks", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to create task");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      setSheetOpen(false);
      reset();
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      projectId,
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
    },
  });

  function onSubmit(data: TaskFormValues) {
    createMutation.mutate(data);
  }

  // Filter tasks
  const filteredTasks = tasks?.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (priorityFilter !== "all" && task.priority !== priorityFilter)
      return false;
    return true;
  });

  // Group tasks by status for kanban view
  const kanbanColumns: Record<string, Task[]> = {
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
  };

  filteredTasks?.forEach((task) => {
    if (task.status in kanbanColumns) {
      kanbanColumns[task.status].push(task);
    }
  });

  if (!orgId) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground text-sm">
            Manage tasks for this project
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="text-muted-foreground h-4 w-4" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {TASK_STATUSES.filter((s) => s !== "cancelled").map((status) => (
                <SelectItem key={status} value={status}>
                  {TASK_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {TASK_PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {TASK_PRIORITY_LABELS[priority]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "kanban" ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => setViewMode("kanban")}
            aria-label="Kanban view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Task Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : !filteredTasks || filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <ListIcon className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="text-lg font-medium">No tasks found</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {statusFilter !== "all" || priorityFilter !== "all"
              ? "Try adjusting your filters."
              : "Create your first task to get started."}
          </p>
          <Button className="mt-4" onClick={() => setSheetOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      ) : viewMode === "list" ? (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-accent/50 transition-colors"
                >
                  <div
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      PRIORITY_DOT_COLORS[task.priority] ?? "bg-gray-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-muted-foreground text-xs truncate">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {TASK_STATUS_LABELS[task.status] ?? task.status}
                  </Badge>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
                  </Badge>
                  {task.assigneeId && (
                    <Avatar size="sm">
                      <AvatarFallback>
                        {task.assigneeId.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <span className="text-muted-foreground text-xs shrink-0 w-24 text-right">
                    {task.dueDate ? formatDate(task.dueDate) : "No date"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Kanban View */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(["todo", "in_progress", "in_review", "done"] as const).map(
            (status) => (
              <div
                key={status}
                className={`rounded-lg border border-t-4 ${STATUS_COLUMN_COLORS[status]} bg-muted/30`}
              >
                <div className="flex items-center justify-between p-3 pb-2">
                  <h3 className="text-sm font-semibold">
                    {TASK_STATUS_LABELS[status]}
                  </h3>
                  <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                    {kanbanColumns[status].length}
                  </span>
                </div>
                <div className="space-y-2 p-2 pt-0 min-h-[120px]">
                  {kanbanColumns[status].length === 0 ? (
                    <p className="text-muted-foreground text-xs text-center py-6">
                      No tasks
                    </p>
                  ) : (
                    kanbanColumns[status].map((task) => (
                      <Card
                        key={task.id}
                        className="cursor-pointer hover:shadow-md transition-shadow py-3"
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-snug">
                              {task.title}
                            </p>
                            <div
                              className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${
                                PRIORITY_DOT_COLORS[task.priority] ??
                                "bg-gray-400"
                              }`}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="secondary"
                              className="text-xs"
                            >
                              {TASK_PRIORITY_LABELS[task.priority] ??
                                task.priority}
                            </Badge>
                            {task.dueDate && (
                              <span className="text-muted-foreground text-xs">
                                {formatDate(task.dueDate, "MMM d")}
                              </span>
                            )}
                          </div>
                          {task.assigneeId && (
                            <div className="flex items-center gap-1.5">
                              <Avatar size="sm">
                                <AvatarFallback>
                                  {task.assigneeId
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-muted-foreground text-xs truncate">
                                {task.assigneeId}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Create Task Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create New Task</SheetTitle>
            <SheetDescription>
              Add a new task to this project
            </SheetDescription>
          </SheetHeader>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 px-4 pb-4"
          >
            {createMutation.error && (
              <p className="text-destructive text-sm">
                {createMutation.error.message}
              </p>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="task-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="task-title"
                placeholder="Task title"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-destructive text-sm">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                placeholder="Describe the task..."
                rows={3}
                {...register("description")}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                defaultValue="todo"
                onValueChange={(value) =>
                  setValue(
                    "status",
                    value as TaskFormValues["status"]
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.filter((s) => s !== "cancelled").map(
                    (status) => (
                      <SelectItem key={status} value={status}>
                        {TASK_STATUS_LABELS[status]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                defaultValue="medium"
                onValueChange={(value) =>
                  setValue(
                    "priority",
                    value as TaskFormValues["priority"]
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {TASK_PRIORITY_LABELS[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                onChange={(e) => {
                  const value = e.target.value;
                  setValue(
                    "dueDate",
                    value ? new Date(value).toISOString() : undefined
                  );
                }}
              />
            </div>

            {/* Estimated Time */}
            <div className="space-y-2">
              <Label htmlFor="task-estimated">
                Estimated Time (minutes)
              </Label>
              <Input
                id="task-estimated"
                type="number"
                placeholder="e.g. 60"
                min={1}
                onChange={(e) => {
                  const value = e.target.value;
                  setValue(
                    "estimatedMinutes",
                    value ? parseInt(value, 10) : undefined
                  );
                }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ListIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
      <path d="M3 6h.01" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M8 6h13" />
    </svg>
  );
}
