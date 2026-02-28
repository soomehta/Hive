"use client";

import { useState } from "react";
import {
  DndContext,
  closestCorners,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  AlertCircle,
  ListTodo,
  CheckSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TaskQuickAdd } from "./task-quick-add";
import { formatDate } from "@/lib/utils/dates";
import { getDueDateClassName, isOverdue } from "@/components/shared/due-date-styles";
import { getUserDisplayName, getUserInitials } from "@/lib/utils/user-display";
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from "@/lib/utils/constants";
import type { Task } from "@/types";

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

export const KANBAN_STATUSES = ["todo", "in_progress", "in_review", "done"] as const;
export type KanbanStatus = (typeof KANBAN_STATUSES)[number];

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

// ─── Drag Overlay Card ──────────────────────────────────

function KanbanTaskCardOverlay({ task }: { task: Task }) {
  return (
    <Card className="shadow-lg py-3 rotate-2 w-48 sm:w-56">
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

// ─── Kanban Board ───────────────────────────────────────

interface TaskKanbanBoardProps {
  tasks: Task[];
  selectedTasks: Set<string>;
  subtaskCounts: Map<string, number>;
  quickAddColumn: string | null;
  quickAddTitle: string;
  onToggleSelect: (id: string) => void;
  onOpenDetail: (task: Task) => void;
  onQuickAddActivate: (column: string) => void;
  onQuickAddTitleChange: (value: string) => void;
  onQuickAddConfirm: (status: string) => void;
  onQuickAddCancel: () => void;
  onTaskStatusChange: (taskId: string, status: string, position?: number) => void;
}

export function TaskKanbanBoard({
  tasks,
  selectedTasks,
  subtaskCounts,
  quickAddColumn,
  quickAddTitle,
  onToggleSelect,
  onOpenDetail,
  onQuickAddActivate,
  onQuickAddTitleChange,
  onQuickAddConfirm,
  onQuickAddCancel,
  onTaskStatusChange,
}: TaskKanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Group tasks by status
  const kanbanColumns: Record<KanbanStatus, Task[]> = {
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
  };

  tasks.forEach((task) => {
    if (task.status in kanbanColumns) {
      kanbanColumns[task.status as KanbanStatus].push(task);
    }
  });

  // Sort each column by position
  for (const status of KANBAN_STATUSES) {
    kanbanColumns[status].sort((a, b) => a.position - b.position);
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    let targetStatus: KanbanStatus | undefined;
    let targetPosition: number | undefined;

    if (KANBAN_STATUSES.includes(overId as KanbanStatus)) {
      targetStatus = overId as KanbanStatus;
      targetPosition = 0;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status as KanbanStatus;
        targetPosition = overTask.position;
      }
    }

    if (!targetStatus) return;

    const draggedTask = tasks.find((t) => t.id === taskId);
    if (!draggedTask) return;
    if (draggedTask.status === targetStatus && draggedTask.position === targetPosition) return;

    onTaskStatusChange(taskId, targetStatus, targetPosition ?? 0);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x md:grid md:grid-cols-2 md:overflow-visible md:pb-0 lg:grid-cols-4">
        {KANBAN_STATUSES.map((status) => (
          <div
            key={status}
            className={`min-w-[280px] shrink-0 snap-center rounded-lg border border-t-4 md:min-w-0 md:shrink ${STATUS_COLUMN_COLORS[status]} bg-muted/30`}
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
                      onToggleSelect={onToggleSelect}
                      onOpenDetail={onOpenDetail}
                      subtaskCount={subtaskCounts.get(task.id)}
                    />
                  ))
                )}
              </div>
            </SortableContext>
            <div className="px-2 pb-2">
              <TaskQuickAdd
                columnStatus={status}
                activeColumn={quickAddColumn}
                title={quickAddTitle}
                onActivate={onQuickAddActivate}
                onTitleChange={onQuickAddTitleChange}
                onConfirm={() => onQuickAddConfirm(status)}
                onCancel={onQuickAddCancel}
              />
            </div>
          </div>
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <KanbanTaskCardOverlay task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
