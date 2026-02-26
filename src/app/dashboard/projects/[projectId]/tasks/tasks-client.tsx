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
import { formatDate } from "@/lib/utils/dates";
import { getDueDateClassName, isOverdue } from "@/lib/utils/due-date-styles";
import { getUserDisplayName, getUserInitials } from "@/lib/utils/user-display";
import {
  Card,
  CardContent,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DndContext,
  closestCorners,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  List,
  LayoutGrid,
  Filter,
  Trash2,
  X,
  CheckSquare,
  ArrowUpDown,
  UserPlus,
  GripVertical,
  AlertCircle,
  MessageSquare,
  ListTodo,
  Send,
  Activity,
} from "lucide-react";
import type { Task, TaskComment, ActivityLogEntry } from "@/types";
import { relativeDate } from "@/lib/utils/dates";
import { getActivityDescription } from "@/lib/utils/activity-descriptions";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { toast } from "sonner";

type TaskFormValues = z.infer<typeof createTaskSchema>;

interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  joinedAt: string;
}

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

const KANBAN_STATUSES = ["todo", "in_progress", "in_review", "done"] as const;
type KanbanStatus = (typeof KANBAN_STATUSES)[number];

// ─── Sortable Task Card ─────────────────────────────────

function SortableTaskCard({
  task,
  isSelected,
  onToggleSelect,
  onOpenDetail,
  subtaskCount,
}: {
  task: Task;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenDetail: (task: Task) => void;
  subtaskCount?: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="cursor-pointer hover:shadow-md transition-shadow py-3"
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="mt-0.5 shrink-0"
            onClick={(e) => { e.stopPropagation(); onToggleSelect(task.id); }}
            aria-label={isSelected ? "Deselect task" : "Select task"}
          >
            <div className={`h-4 w-4 rounded border ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"} flex items-center justify-center`}>
              {isSelected && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
            </div>
          </button>
          <div
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing touch-none"
            aria-label="Drag handle"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div
            className="flex-1 min-w-0"
            role="button"
            tabIndex={0}
            onClick={() => onOpenDetail(task)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenDetail(task); } }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-snug">
                {task.title}
              </p>
              <div
                className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${
                  PRIORITY_DOT_COLORS[task.priority] ?? "bg-gray-400"
                }`}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <Badge variant="secondary" className="text-xs">
                {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
              </Badge>
              {task.dueDate && (
                <span className={`text-xs flex items-center gap-1 ${getDueDateClassName(task.dueDate)}`}>
                  {isOverdue(task.dueDate) && <AlertCircle className="h-3 w-3" />}
                  {formatDate(task.dueDate, "MMM d")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              {task.assigneeId && (
                <div className="flex items-center gap-1.5">
                  <Avatar size="sm">
                    <AvatarFallback>
                      {getUserInitials(getUserDisplayName({ userId: task.assigneeId }))}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground text-xs truncate">
                    {getUserDisplayName({ userId: task.assigneeId })}
                  </span>
                </div>
              )}
              {subtaskCount && subtaskCount > 0 ? (
                <span className="ml-auto flex items-center gap-0.5 text-muted-foreground text-xs">
                  <ListTodo className="h-3 w-3" />
                  {subtaskCount}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Kanban Task Card (non-sortable, for DragOverlay) ───

function KanbanTaskCardOverlay({ task }: { task: Task }) {
  return (
    <Card className="shadow-lg py-3 rotate-2 w-56">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          <div
            className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${
              PRIORITY_DOT_COLORS[task.priority] ?? "bg-gray-400"
            }`}
          />
        </div>
        <Badge variant="secondary" className="text-xs">
          {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
        </Badge>
      </CardContent>
    </Card>
  );
}

// ─── Main Page Client ───────────────────────────────────

export function PageClient() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { orgId } = useOrg();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Bulk selection state
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkOperating, setBulkOperating] = useState(false);

  // Comment state
  const [commentText, setCommentText] = useState("");

  // Subtask add state
  const [subtaskTitle, setSubtaskTitle] = useState("");

  // Quick-add state for kanban columns
  const [quickAddColumn, setQuickAddColumn] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");

  // DnD state
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

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

  // Comments for selected task
  const { data: comments } = useQuery({
    queryKey: ["task-comments", selectedTask?.id],
    queryFn: async () => {
      const res = await apiClient(`/api/tasks/${selectedTask!.id}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      const json = await res.json();
      return json.data as TaskComment[];
    },
    enabled: !!selectedTask && detailOpen,
  });

  // Activity for selected task
  const { data: taskActivity } = useQuery({
    queryKey: ["task-activity", selectedTask?.id],
    queryFn: async () => {
      const res = await apiClient(`/api/activity?taskId=${selectedTask!.id}&limit=20`);
      if (!res.ok) throw new Error("Failed to fetch activity");
      const json = await res.json();
      return json.data as ActivityLogEntry[];
    },
    enabled: !!selectedTask && detailOpen,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiClient(`/api/tasks/${selectedTask!.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", selectedTask?.id] });
      setCommentText("");
      toast.success("Comment added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add comment");
    },
  });

  // Subtasks for selected task
  const { data: subtasks } = useQuery({
    queryKey: ["task-subtasks", selectedTask?.id],
    queryFn: async () => {
      const res = await apiClient(`/api/tasks/${selectedTask!.id}/subtasks`);
      if (!res.ok) throw new Error("Failed to fetch subtasks");
      const json = await res.json();
      return json.data as Task[];
    },
    enabled: !!selectedTask && detailOpen,
  });

  const addSubtaskMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiClient("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          title,
          status: "todo",
          priority: "medium",
          parentTaskId: selectedTask!.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to create subtask");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-subtasks", selectedTask?.id] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      setSubtaskTitle("");
      toast.success("Subtask created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create subtask");
    },
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
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDetailOpen(false);
      setSelectedTask(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete task");
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

  // ─── Bulk Operations ──────────────────────────────────

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
      if (prev.size === filteredTasks.length) {
        return new Set();
      }
      return new Set(filteredTasks.map((t) => t.id));
    });
  }, [tasks, statusFilter, priorityFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearSelection = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);

  async function executeBulkOperation(
    op: "patch" | "delete",
    data?: Record<string, unknown>
  ) {
    const ids = Array.from(selectedTasks);
    if (ids.length === 0) return;

    setBulkOperating(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => {
          if (op === "delete") {
            return apiClient(`/api/tasks/${id}`, { method: "DELETE" });
          }
          return apiClient(`/api/tasks/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          });
        })
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

  // ─── DnD Handlers ────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const task = tasks?.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !tasks) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Determine target status: could be a column ID or a task ID
    let targetStatus: KanbanStatus | undefined;
    let targetPosition: number | undefined;

    if (KANBAN_STATUSES.includes(overId as KanbanStatus)) {
      // Dropped on an empty column
      targetStatus = overId as KanbanStatus;
      targetPosition = 0;
    } else {
      // Dropped on another task — find its status and position
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status as KanbanStatus;
        targetPosition = overTask.position;
      }
    }

    if (!targetStatus) return;

    const draggedTask = tasks.find((t) => t.id === taskId);
    if (!draggedTask) return;

    // Only update if something changed
    if (draggedTask.status === targetStatus && draggedTask.position === targetPosition) return;

    updateMutation.mutate({
      taskId,
      data: {
        status: targetStatus,
        position: targetPosition ?? 0,
      },
    });
  }

  // Filter tasks
  const filteredTasks = tasks?.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (priorityFilter !== "all" && task.priority !== priorityFilter)
      return false;
    return true;
  });

  // Group tasks by status for kanban view
  const kanbanColumns: Record<KanbanStatus, Task[]> = {
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
  };

  filteredTasks?.forEach((task) => {
    if (task.status in kanbanColumns) {
      kanbanColumns[task.status as KanbanStatus].push(task);
    }
  });

  // Sort each column by position
  for (const status of KANBAN_STATUSES) {
    kanbanColumns[status].sort((a, b) => a.position - b.position);
  }

  // Compute subtask counts from loaded tasks
  const subtaskCounts = new Map<string, number>();
  tasks?.forEach((t) => {
    if (t.parentTaskId) {
      subtaskCounts.set(t.parentTaskId, (subtaskCounts.get(t.parentTaskId) ?? 0) + 1);
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
              {/* Select All Header */}
              <div className="flex items-center gap-4 px-4 py-2 bg-muted/30">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="shrink-0"
                  aria-label={selectedTasks.size === filteredTasks.length ? "Deselect all" : "Select all"}
                >
                  <div className={`h-4 w-4 rounded border ${
                    selectedTasks.size > 0 && selectedTasks.size === filteredTasks.length
                      ? "bg-primary border-primary"
                      : selectedTasks.size > 0
                        ? "bg-primary/50 border-primary"
                        : "border-muted-foreground/40"
                  } flex items-center justify-center`}>
                    {selectedTasks.size > 0 && (
                      <CheckSquare className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                </button>
                <span className="text-xs text-muted-foreground">
                  {selectedTasks.size > 0
                    ? `${selectedTasks.size} selected`
                    : "Select all"}
                </span>
              </div>
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex w-full items-center gap-4 px-4 py-3 hover:bg-accent/50 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleTaskSelection(task.id)}
                    className="shrink-0"
                    aria-label={selectedTasks.has(task.id) ? "Deselect task" : "Select task"}
                  >
                    <div className={`h-4 w-4 rounded border ${selectedTasks.has(task.id) ? "bg-primary border-primary" : "border-muted-foreground/40"} flex items-center justify-center`}>
                      {selectedTasks.has(task.id) && (
                        <CheckSquare className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-4 cursor-pointer text-left min-w-0"
                    onClick={() => { setSelectedTask(task); setDetailOpen(true); }}
                    aria-label={`View task: ${task.title}`}
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
                          {getUserInitials(getUserDisplayName({ userId: task.assigneeId }))}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span className={`text-xs shrink-0 w-24 text-right flex items-center justify-end gap-1 ${getDueDateClassName(task.dueDate)}`}>
                      {task.dueDate && isOverdue(task.dueDate) && <AlertCircle className="h-3 w-3" />}
                      {task.dueDate ? formatDate(task.dueDate) : "No date"}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Kanban View with DnD */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {KANBAN_STATUSES.map((status) => (
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
                <SortableContext
                  items={kanbanColumns[status].map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                  id={status}
                >
                  <div className="space-y-2 p-2 pt-0 min-h-[120px]" data-column={status}>
                    {kanbanColumns[status].length === 0 ? (
                      <div
                        className="text-muted-foreground text-xs text-center py-6"
                        data-column={status}
                      >
                        No tasks
                      </div>
                    ) : (
                      kanbanColumns[status].map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          isSelected={selectedTasks.has(task.id)}
                          onToggleSelect={toggleTaskSelection}
                          onOpenDetail={(t) => { setSelectedTask(t); setDetailOpen(true); }}
                          subtaskCount={subtaskCounts.get(task.id)}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
                {/* Quick-add inline input */}
                <div className="px-2 pb-2">
                  {quickAddColumn === status ? (
                    <Input
                      autoFocus
                      placeholder="Task title..."
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && quickAddTitle.trim()) {
                          createMutation.mutate({
                            projectId,
                            title: quickAddTitle.trim(),
                            status,
                            priority: "medium",
                          });
                          setQuickAddTitle("");
                        }
                        if (e.key === "Escape") {
                          setQuickAddColumn(null);
                          setQuickAddTitle("");
                        }
                      }}
                      onBlur={() => {
                        setQuickAddColumn(null);
                        setQuickAddTitle("");
                      }}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-muted-foreground text-xs"
                      onClick={() => {
                        setQuickAddColumn(status);
                        setQuickAddTitle("");
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add task
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <KanbanTaskCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Bulk Action Toolbar */}
      {selectedTasks.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border bg-background p-3 shadow-lg">
          <span className="text-sm font-medium mr-2">
            {selectedTasks.size} selected
          </span>
          <Separator orientation="vertical" className="h-6" />

          {/* Status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={bulkOperating}>
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {TASK_STATUSES.filter((s) => s !== "cancelled").map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => executeBulkOperation("patch", { status })}
                >
                  {TASK_STATUS_LABELS[status]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Priority */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={bulkOperating}>
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                Priority
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {TASK_PRIORITIES.map((priority) => (
                <DropdownMenuItem
                  key={priority}
                  onClick={() => executeBulkOperation("patch", { priority })}
                >
                  {TASK_PRIORITY_LABELS[priority]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assign */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={bulkOperating}>
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Assign
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => executeBulkOperation("patch", { assigneeId: null })}
              >
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

          {/* Delete */}
          <Button
            variant="destructive"
            size="sm"
            disabled={bulkOperating}
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>

          {/* Clear selection */}
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
            <AlertDialogTitle>Delete {selectedTasks.size} task{selectedTasks.size > 1 ? "s" : ""}?</AlertDialogTitle>
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
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedTask?.title ?? "Task"}</SheetTitle>
            <SheetDescription>Task details</SheetDescription>
          </SheetHeader>
          {selectedTask && (
            <div className="space-y-4 px-4 pb-4">
              <Separator />

              {/* Status selector */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <Select
                  value={selectedTask.status}
                  onValueChange={(value) =>
                    updateMutation.mutate({
                      taskId: selectedTask.id,
                      data: { status: value },
                    })
                  }
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {TASK_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority selector */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                <Select
                  value={selectedTask.priority}
                  onValueChange={(value) =>
                    updateMutation.mutate({
                      taskId: selectedTask.id,
                      data: { priority: value },
                    })
                  }
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
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

              {/* Assignee selector */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-muted-foreground">Assignee</Label>
                <Select
                  value={selectedTask.assigneeId ?? "unassigned"}
                  onValueChange={(value) =>
                    updateMutation.mutate({
                      taskId: selectedTask.id,
                      data: { assigneeId: value === "unassigned" ? null : value },
                    })
                  }
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
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

              {/* Due date input */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="detail-due-date"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Due Date
                </Label>
                <Input
                  id="detail-due-date"
                  type="date"
                  defaultValue={
                    selectedTask.dueDate
                      ? new Date(selectedTask.dueDate).toISOString().split("T")[0]
                      : ""
                  }
                  onBlur={(e) => {
                    const value = e.target.value;
                    const newDate = value
                      ? new Date(value).toISOString()
                      : null;
                    if (newDate !== selectedTask.dueDate) {
                      updateMutation.mutate({
                        taskId: selectedTask.id,
                        data: { dueDate: newDate },
                      });
                    }
                  }}
                  disabled={updateMutation.isPending}
                />
              </div>

              <Separator />

              {/* Description */}
              {selectedTask.description && (
                <div>
                  <h4 className="mb-1 text-sm font-medium text-muted-foreground">Description</h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              )}

              {/* Estimate */}
              {selectedTask.estimatedMinutes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Estimate</h4>
                  <p className="text-sm">
                    {selectedTask.estimatedMinutes >= 60
                      ? `${Math.floor(selectedTask.estimatedMinutes / 60)}h ${selectedTask.estimatedMinutes % 60 > 0 ? `${selectedTask.estimatedMinutes % 60}m` : ""}`
                      : `${selectedTask.estimatedMinutes}m`}
                    {" "}({selectedTask.estimatedMinutes} min)
                  </p>
                </div>
              )}

              <Separator />

              {/* Comments & Activity Tabs */}
              <Tabs defaultValue="comments">
                <TabsList className="w-full">
                  <TabsTrigger value="comments" className="flex-1 gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Comments ({comments?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex-1 gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    Activity
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="comments" className="space-y-3 mt-3">
                  {comments && comments.length > 0 ? (
                    <div className="space-y-2">
                      {comments.map((c) => (
                        <div key={c.id} className="rounded-lg bg-muted p-3">
                          <p className="text-sm">{c.content}</p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {relativeDate(c.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">No comments yet.</p>
                  )}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      className="self-end"
                      onClick={() => commentText.trim() && addCommentMutation.mutate(commentText.trim())}
                      disabled={!commentText.trim() || addCommentMutation.isPending}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-3">
                  {taskActivity && taskActivity.length > 0 ? (
                    <div className="space-y-2">
                      {taskActivity.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-2 py-1.5">
                          <Activity className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm">
                              {getActivityDescription(
                                entry.type as Parameters<typeof getActivityDescription>[0],
                                entry.metadata as Parameters<typeof getActivityDescription>[1]
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {relativeDate(entry.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">No activity yet.</p>
                  )}
                </TabsContent>
              </Tabs>

              {/* Subtasks */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <ListTodo className="h-3.5 w-3.5" />
                  Subtasks {subtasks && subtasks.length > 0 && `(${subtasks.length})`}
                </h4>
                {subtasks && subtasks.length > 0 && (
                  <div className="space-y-1">
                    {subtasks.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/50 transition-colors"
                        onClick={() => { setSelectedTask(st); setCommentText(""); setSubtaskTitle(""); }}
                      >
                        <div className={`h-2 w-2 rounded-full shrink-0 ${
                          st.status === "done" ? "bg-green-500" : st.status === "in_progress" ? "bg-blue-500" : "bg-gray-400"
                        }`} />
                        <span className={st.status === "done" ? "line-through text-muted-foreground" : ""}>
                          {st.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add subtask..."
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && subtaskTitle.trim()) {
                        addSubtaskMutation.mutate(subtaskTitle.trim());
                      }
                    }}
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => subtaskTitle.trim() && addSubtaskMutation.mutate(subtaskTitle.trim())}
                    disabled={!subtaskTitle.trim() || addSubtaskMutation.isPending}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Delete button */}
              <div className="pt-2 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-start"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deleteMutation.isPending ? "Deleting..." : "Delete Task"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete task?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete &ldquo;{selectedTask.title}&rdquo;. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(selectedTask.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

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

            {/* Assignee */}
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                onValueChange={(value) =>
                  setValue(
                    "assigneeId",
                    value === "unassigned" ? undefined : value
                  )
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
              <p className="text-xs text-muted-foreground">
                Enter time in minutes (e.g. 90 = 1h 30m)
              </p>
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
