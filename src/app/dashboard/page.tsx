"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
import { getActivityDescription } from "@/lib/utils/activity-descriptions";
import { relativeDate, formatDate } from "@/lib/utils/dates";
import { isToday } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, Activity, ListTodo } from "lucide-react";
import Link from "next/link";
import type { Task, ActivityLogEntry } from "@/types";
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from "@/lib/utils/constants";

export default function DashboardPage() {
  const { orgId } = useOrg();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("User");

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserName(
          user.user_metadata?.full_name ?? user.email ?? "User"
        );
      }
    }
    fetchUser();
  }, []);

  const {
    data: tasksData,
    isLoading: tasksLoading,
  } = useQuery({
    queryKey: ["dashboard-tasks", orgId, userId],
    queryFn: async () => {
      const res = await apiClient(
        `/api/tasks?assigneeId=${userId}&status=todo,in_progress`
      );
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return json.data as Task[];
    },
    enabled: !!orgId && !!userId,
  });

  const {
    data: activityData,
    isLoading: activityLoading,
  } = useQuery({
    queryKey: ["dashboard-activity", orgId],
    queryFn: async () => {
      const res = await apiClient("/api/activity?limit=10");
      if (!res.ok) throw new Error("Failed to fetch activity");
      const json = await res.json();
      return json.data as ActivityLogEntry[];
    },
    enabled: !!orgId,
  });

  const tasksDueToday = tasksData?.filter(
    (task) => task.dueDate && isToday(new Date(task.dueDate))
  ) ?? [];

  if (!orgId) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}, {userName.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Here is what is happening in your workspace today.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Stats Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Tasks Due Today
            </CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasksLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                tasksDueToday.length
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Tasks
            </CardTitle>
            <ListTodo className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasksLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                (tasksData?.length ?? 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Events
            </CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activityLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                (activityData?.length ?? 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks Due Today */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Tasks Due Today
            </CardTitle>
            <CardDescription>
              Tasks assigned to you that are due today
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : tasksDueToday.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No tasks due today. You are all caught up!
              </p>
            ) : (
              <div className="space-y-3">
                {tasksDueToday.map((task) => (
                  <Link
                    key={task.id}
                    href={`/dashboard/projects/${task.projectId}/tasks`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          task.priority === "urgent"
                            ? "bg-red-500"
                            : task.priority === "high"
                            ? "bg-orange-500"
                            : task.priority === "medium"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                      />
                      <span className="text-sm font-medium truncate">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {TASK_STATUS_LABELS[task.status] ?? task.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest actions across your workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !activityData || activityData.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No recent activity yet.
              </p>
            ) : (
              <div className="space-y-3">
                {activityData.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        {getActivityDescription(
                          entry.type as Parameters<typeof getActivityDescription>[0],
                          entry.metadata as Parameters<typeof getActivityDescription>[1]
                        )}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {relativeDate(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
