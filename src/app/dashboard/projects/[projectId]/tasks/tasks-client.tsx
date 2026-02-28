"use client";

import { useState, useCallback } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
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
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  X,
  ArrowUpDown,
  UserPlus,
} from "lucide-react";
import type { Task } from "@/types";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { toast } from "sonner";
import { getUserDisplayName } from "@/lib/utils/user-display";
import { TaskFilters } from "./components/task-filters";
import { TaskListView } from "./components/task-list-view";
import { TaskKanbanBoard } from "./components/task-kanban-board";
import { TaskDetailSheet } from "./components/task-detail-sheet";

type TaskFormValues = z.infer<typeof createTaskSchema>;

interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  joinedAt: string;
}

export function PageClient() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { orgId } = useOrg();
  const queryClient = useQueryClient();

  // View / filter state
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Bulk selection
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkOperating, setBulkOperating] = useState(false);

  // Quick-add state for kanban columns
  const [quickAddColumn, setQuickAddColumn] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");

  // ─── Queries ─────────────────────────────────────────

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await apiClient(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      const json = await res.json();
      return json.data as { id: string; name: string };
    },
    enabled: !!orgId && !!projectId,
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["project-tasks", projectId, orgId],
    queryFn: async () => {
      const res = await apiClient(`/api/tasks?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return json.data as Task[];
    },
    enabled: !!orgId && !!projectId,
  });

  const { data: members } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      const res = await apiClient(`/api/projects/${projectId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      const json = await res.json();
      return json.data as ProjectMember[];
    },
    enabled: !!orgId && !!projectId,
  });

  // ─── Mutations ───────────────────────────────────────

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
      toast.success("Task created");
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setSheetOpen(false);
      reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create task");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Record<string, unknown> }) => {
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
      toast.success("Task updated");
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
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
      const res = await apiClient(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete task");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Task deleted");
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDetailOpen(false);
      setSelectedTask(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete task");
    },
  });

  // ─── Form ─────────────────────────────────────────────

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<TaskFormValues>({
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

  // ─── Filtering ────────────────────────────────────────

  const filteredTasks = tasks?.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
    return true;
  });

  // Subtask counts from loaded tasks
  const subtaskCounts = new Map<string, number>();
  tasks?.forEach((t) => {
    if (t.parentTaskId) {
      subtaskCounts.set(t.parentTaskId, (subtaskCounts.get(t.parentTaskId) ?? 0) + 1);
    }
  });

  // ─── Selection Handlers ───────────────────────────────

  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!filteredTasks) return;
    setSelectedTasks((prev) => {
      if (prev.size === filteredTasks.length) return new Set();
      return new Set(filteredTasks.map((t) => t.id));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, statusFilter, priorityFilter]);

  const clearSelection = useCallback(() => setSelectedTasks(new Set()), []);

  // ─── Bulk Operations ──────────────────────────────────

  async function executeBulkOperation(op: "patch" | "delete", data?: Record<string, unknown>) {
    const ids = Array.from(selectedTasks);
    if (ids.length === 0) return;

    setBulkOperating(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          op === "delete"
            ? apiClient(`/api/tasks/${id}`, { method: "DELETE" })
            : apiClient(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) })
        )
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;

      if (failed === 0) {
        toast.success(`${succeeded} task${succeeded > 1 ? "s" : ""} updated`);
      } else {
        toast.warning(`${succeeded} succeeded, ${failed} failed`);
      }

      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setSelectedTasks(new Set());
      setBulkDeleteOpen(false);
    } finally {
      setBulkOperating(false);
    }
  }

  // ─── Quick-Add Handlers ───────────────────────────────

  function handleQuickAddConfirm(status: string) {
    if (!quickAddTitle.trim()) return;
    createMutation.mutate({
      projectId,
      title: quickAddTitle.trim(),
      status: status as TaskFormValues["status"],
      priority: "medium",
    });
    setQuickAddTitle("");
    setQuickAddColumn(null);
  }

  function handleQuickAddCancel() {
    setQuickAddColumn(null);
    setQuickAddTitle("");
  }

  // ─── Task Status Change (DnD) ─────────────────────────

  function handleTaskStatusChange(taskId: string, status: string, position?: number) {
    updateMutation.mutate({
      taskId,
      data: { status, position: position ?? 0 },
    });
  }

  // ─── Early returns ────────────────────────────────────

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
      <Breadcrumbs
        items={[
          { label: "Projects", href: "/dashboard/projects" },
          { label: project?.name ?? "Project", href: `/dashboard/projects/${projectId}` },
          { label: "Tasks" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground text-sm">Manage tasks for this project</p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Filters & View Toggle */}
      <TaskFilters
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        viewMode={viewMode}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriorityFilter}
        onViewModeChange={setViewMode}
      />

      {/* Task Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : !filteredTasks || filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
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
        <TaskListView
          tasks={filteredTasks}
          selectedTasks={selectedTasks}
          onToggleSelect={toggleTaskSelection}
          onToggleSelectAll={toggleSelectAll}
          onOpenDetail={(task) => { setSelectedTask(task); setDetailOpen(true); }}
        />
      ) : (
        <TaskKanbanBoard
          tasks={filteredTasks}
          selectedTasks={selectedTasks}
          subtaskCounts={subtaskCounts}
          quickAddColumn={quickAddColumn}
          quickAddTitle={quickAddTitle}
          onToggleSelect={toggleTaskSelection}
          onOpenDetail={(task) => { setSelectedTask(task); setDetailOpen(true); }}
          onQuickAddActivate={setQuickAddColumn}
          onQuickAddTitleChange={setQuickAddTitle}
          onQuickAddConfirm={handleQuickAddConfirm}
          onQuickAddCancel={handleQuickAddCancel}
          onTaskStatusChange={handleTaskStatusChange}
        />
      )}

      {/* Bulk Action Toolbar */}
      {selectedTasks.size > 0 && (
        <div className="fixed bottom-4 left-2 right-2 z-50 flex flex-wrap justify-center items-center gap-2 rounded-lg border bg-background p-3 shadow-lg sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:bottom-6 sm:flex-nowrap">
          <span className="text-sm font-medium mr-2">{selectedTasks.size} selected</span>
          <Separator orientation="vertical" className="h-6" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={bulkOperating}>
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {TASK_STATUSES.filter((s) => s !== "cancelled").map((status) => (
                <DropdownMenuItem key={status} onClick={() => executeBulkOperation("patch", { status })}>
                  {TASK_STATUS_LABELS[status]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={bulkOperating}>
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                Priority
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {TASK_PRIORITIES.map((priority) => (
                <DropdownMenuItem key={priority} onClick={() => executeBulkOperation("patch", { priority })}>
                  {TASK_PRIORITY_LABELS[priority]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={bulkOperating}>
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Assign
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => executeBulkOperation("patch", { assigneeId: null })}>
                Unassigned
              </DropdownMenuItem>
              {members?.map((member) => (
                <DropdownMenuItem
                  key={member.userId}
                  onClick={() => executeBulkOperation("patch", { assigneeId: member.userId })}
                >
                  {getUserDisplayName({ userId: member.userId })}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="destructive"
            size="sm"
            disabled={bulkOperating}
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={clearSelection}
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedTasks.size} task{selectedTasks.size > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected tasks. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executeBulkOperation("delete")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkOperating ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask}
        open={detailOpen}
        projectId={projectId}
        members={members}
        onOpenChange={setDetailOpen}
        onUpdate={(taskId, data) => updateMutation.mutate({ taskId, data })}
        onDelete={(taskId) => deleteMutation.mutate(taskId)}
        isUpdating={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        onNavigateToSubtask={(subtask) => setSelectedTask(subtask)}
      />

      {/* Create Task Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create New Task</SheetTitle>
            <SheetDescription>Add a new task to this project</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 pb-4">
            {createMutation.error && (
              <p className="text-destructive text-sm">{createMutation.error.message}</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="task-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input id="task-title" placeholder="Task title" {...register("title")} />
              {errors.title && (
                <p className="text-destructive text-sm">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                placeholder="Describe the task..."
                rows={3}
                {...register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                defaultValue="todo"
                onValueChange={(value) => setValue("status", value as TaskFormValues["status"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.filter((s) => s !== "cancelled").map((status) => (
                    <SelectItem key={status} value={status}>
                      {TASK_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                defaultValue="medium"
                onValueChange={(value) => setValue("priority", value as TaskFormValues["priority"])}
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

            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                onValueChange={(value) =>
                  setValue("assigneeId", value === "unassigned" ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members?.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {getUserDisplayName({ userId: member.userId })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                onChange={(e) => {
                  const value = e.target.value;
                  setValue("dueDate", value ? new Date(value).toISOString() : undefined);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-estimated">Estimated Time (minutes)</Label>
              <Input
                id="task-estimated"
                type="number"
                placeholder="e.g. 60"
                min={1}
                onChange={(e) => {
                  const value = e.target.value;
                  setValue("estimatedMinutes", value ? parseInt(value, 10) : undefined);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Enter time in minutes (e.g. 90 = 1h 30m)
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
