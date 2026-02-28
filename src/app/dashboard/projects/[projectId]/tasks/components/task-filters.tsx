"use client";

import { Filter, List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_STATUSES, TASK_PRIORITIES, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/lib/utils/constants";

interface TaskFiltersProps {
  statusFilter: string;
  priorityFilter: string;
  viewMode: "list" | "kanban";
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onViewModeChange: (mode: "list" | "kanban") => void;
}

export function TaskFilters({
  statusFilter,
  priorityFilter,
  viewMode,
  onStatusChange,
  onPriorityChange,
  onViewModeChange,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Filter className="text-muted-foreground h-4 w-4" />
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:w-[140px]">
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
        <Select value={priorityFilter} onValueChange={onPriorityChange}>
          <SelectTrigger className="w-full sm:w-[140px]">
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

      <div className="self-end flex items-center gap-1 rounded-lg border p-1 sm:ml-auto sm:self-auto">
        <Button
          variant={viewMode === "list" ? "secondary" : "ghost"}
          size="icon-xs"
          onClick={() => onViewModeChange("list")}
          aria-label="List view"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "kanban" ? "secondary" : "ghost"}
          size="icon-xs"
          onClick={() => onViewModeChange("kanban")}
          aria-label="Kanban view"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
