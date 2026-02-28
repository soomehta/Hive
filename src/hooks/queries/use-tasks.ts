"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
import type { Task } from "@/types";

export interface TaskFilters {
  projectId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
}

function buildTasksUrl(filters: TaskFilters): string {
  const params = new URLSearchParams();
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.priority && filters.priority !== "all") params.set("priority", filters.priority);
  if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
  const qs = params.toString();
  return `/api/tasks${qs ? `?${qs}` : ""}`;
}

export function useTasksQuery(filters: TaskFilters = {}) {
  const { orgId } = useOrg();

  return useQuery({
    queryKey: ["tasks", orgId, filters],
    queryFn: async () => {
      const res = await apiClient(buildTasksUrl(filters));
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return json.data as Task[];
    },
    enabled: !!orgId,
  });
}

export function useProjectTasksQuery(projectId: string) {
  const { orgId } = useOrg();

  return useQuery({
    queryKey: ["project-tasks", projectId, orgId],
    queryFn: async () => {
      const res = await apiClient(`/api/tasks?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return json.data as Task[];
    },
    enabled: !!orgId && !!projectId,
  });
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  dueDate?: string;
  estimatedMinutes?: number;
  parentTaskId?: string;
}

export function useCreateTaskMutation(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
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
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export interface UpdateTaskInput {
  taskId: string;
  data: Record<string, unknown>;
}

export function useUpdateTaskMutation(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, data }: UpdateTaskInput) => {
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
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTaskMutation(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
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
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
