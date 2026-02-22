"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
import { getActivityDescription } from "@/lib/utils/activity-descriptions";
import { relativeDate, formatDate } from "@/lib/utils/dates";
import {
  PROJECT_STATUS_LABELS,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from "@/lib/utils/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Calendar,
  Users,
  ListTodo,
  MessageSquare,
  Settings,
  Activity,
  CheckSquare,
  CheckCircle2,
  Edit3,
  UserPlus,
  FolderPlus,
} from "lucide-react";
import type { Project, Task, ProjectMember, ActivityLogEntry, Message } from "@/types";
import { getUserDisplayName, getUserInitials } from "@/lib/utils/user-display";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  task_created: CheckSquare,
  task_completed: CheckCircle2,
  task_updated: Edit3,
  member_joined: UserPlus,
  project_created: FolderPlus,
  message_posted: MessageSquare,
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
  archived: "bg-gray-100 text-gray-700",
};

export function PageClient() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { orgId } = useOrg();

  const {
    data: project,
    isLoading: projectLoading,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await apiClient(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      const json = await res.json();
      return json.data as Project;
    },
    enabled: !!orgId && !!projectId,
  });

  const {
    data: members,
    isLoading: membersLoading,
  } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      const res = await apiClient(`/api/projects/${projectId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      const json = await res.json();
      return json.data as ProjectMember[];
    },
    enabled: !!orgId && !!projectId,
  });

  const {
    data: tasks,
    isLoading: tasksLoading,
  } = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      const res = await apiClient(`/api/tasks?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return json.data as Task[];
    },
    enabled: !!orgId && !!projectId,
  });

  const {
    data: messages,
    isLoading: messagesLoading,
  } = useQuery({
    queryKey: ["project-messages", projectId],
    queryFn: async () => {
      const res = await apiClient(`/api/messages?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const json = await res.json();
      return json.data as Message[];
    },
    enabled: !!orgId && !!projectId,
  });

  const {
    data: activityData,
    isLoading: activityLoading,
  } = useQuery({
    queryKey: ["project-activity", projectId],
    queryFn: async () => {
      const res = await apiClient(
        `/api/activity?projectId=${projectId}&limit=10`
      );
      if (!res.ok) throw new Error("Failed to fetch activity");
      const json = await res.json();
      return json.data as ActivityLogEntry[];
    },
    enabled: !!orgId && !!projectId,
  });

  if (!orgId) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Projects", href: "/dashboard/projects" },
          { label: project?.name ?? "Project" },
        ]}
      />
      {/* Project Header */}
      {projectLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      ) : project ? (
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {project.color && (
              <div
                className="h-4 w-4 rounded-full shrink-0"
                style={{ backgroundColor: project.color }}
              />
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {project.name}
                </h1>
                <Badge
                  variant="secondary"
                  className={STATUS_BADGE_COLORS[project.status] ?? ""}
                >
                  {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                </Badge>
              </div>
              {project.description && (
                <p className="text-muted-foreground mt-1 text-sm">
                  {project.description}
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/projects/${projectId}/settings`}>
              <Settings className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground">Project not found.</p>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks
            {tasks && (
              <span className="bg-muted text-muted-foreground ml-1.5 rounded-full px-1.5 py-0.5 text-xs">
                {tasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages">
            Messages
            {messages && (
              <span className="bg-muted text-muted-foreground ml-1.5 rounded-full px-1.5 py-0.5 text-xs">
                {messages.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Project Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent>
                {projectLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : project ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-muted-foreground h-4 w-4" aria-hidden="true" />
                        <span className="text-sm">
                          <span className="text-muted-foreground">
                            Start:{" "}
                          </span>
                          {project.startDate
                            ? formatDate(project.startDate)
                            : "Not set"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="text-muted-foreground h-4 w-4" aria-hidden="true" />
                        <span className="text-sm">
                          <span className="text-muted-foreground">
                            Target:{" "}
                          </span>
                          {project.targetDate
                            ? formatDate(project.targetDate)
                            : "Not set"}
                        </span>
                      </div>
                    </div>
                    {project.description && (
                      <div>
                        <h3 className="text-muted-foreground text-sm font-medium mb-1">
                          Description
                        </h3>
                        <p className="text-sm whitespace-pre-wrap">
                          {project.description}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-4 pt-2">
                      <div className="flex items-center gap-2">
                        <ListTodo className="text-muted-foreground h-4 w-4" aria-hidden="true" />
                        <span className="text-sm">
                          {tasksLoading ? (
                            <Skeleton className="h-4 w-8 inline-block" />
                          ) : (
                            `${tasks?.length ?? 0} tasks`
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="text-muted-foreground h-4 w-4" aria-hidden="true" />
                        <span className="text-sm">
                          {membersLoading ? (
                            <Skeleton className="h-4 w-8 inline-block" />
                          ) : (
                            `${members?.length ?? 0} members`
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="text-muted-foreground h-4 w-4" aria-hidden="true" />
                        <span className="text-sm">
                          {messagesLoading ? (
                            <Skeleton className="h-4 w-8 inline-block" />
                          ) : (
                            `${messages?.length ?? 0} messages`
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 flex-1" />
                      </div>
                    ))}
                  </div>
                ) : !members || members.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No members yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2"
                      >
                        <Avatar size="sm">
                          <AvatarFallback>
                            {getUserInitials(getUserDisplayName({ userId: member.userId }))}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {getUserDisplayName({ userId: member.userId })}
                          </p>
                          <p className="text-muted-foreground text-xs capitalize">
                            {member.role}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest actions in this project
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
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No activity yet for this project.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activityData.map((entry) => {
                      const Icon = ACTIVITY_ICONS[entry.type] ?? Activity;
                      return (
                        <div
                          key={entry.id}
                          className="flex items-start gap-3 rounded-lg border p-3"
                        >
                          <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                            <Icon className="h-4 w-4 text-muted-foreground" />
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
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tasks</CardTitle>
                <CardDescription>
                  All tasks in this project
                </CardDescription>
              </div>
              <Button asChild>
                <Link
                  href={`/dashboard/projects/${projectId}/tasks`}
                >
                  View All Tasks
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              ) : !tasks || tasks.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No tasks created yet. Go to the tasks page to add some.
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.slice(0, 10).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            task.status === "done"
                              ? "bg-green-500"
                              : task.status === "in_progress"
                              ? "bg-blue-500"
                              : task.status === "in_review"
                              ? "bg-purple-500"
                              : "bg-gray-400"
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
                        {task.dueDate && (
                          <span className="text-muted-foreground text-xs">
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {tasks.length > 10 && (
                    <p className="text-muted-foreground text-center text-sm pt-2">
                      Showing 10 of {tasks.length} tasks.{" "}
                      <Link
                        href={`/dashboard/projects/${projectId}/tasks`}
                        className="text-primary underline"
                      >
                        View all
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Messages</CardTitle>
                <CardDescription>
                  Team discussions for this project
                </CardDescription>
              </div>
              <Button asChild>
                <Link
                  href={`/dashboard/projects/${projectId}/messages`}
                >
                  View All Messages
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {messagesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ))}
                </div>
              ) : !messages || messages.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No messages yet. Start a conversation with your team.
                </p>
              ) : (
                <div className="space-y-3">
                  {messages.slice(0, 5).map((msg) => (
                    <div
                      key={msg.id}
                      className="rounded-lg border p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar size="sm">
                            <AvatarFallback>
                              {getUserInitials(getUserDisplayName({ userId: msg.userId }))}
                            </AvatarFallback>
                          </Avatar>
                          {msg.title && (
                            <span className="text-sm font-medium">
                              {msg.title}
                            </span>
                          )}
                          {msg.isPinned && (
                            <Badge variant="secondary" className="text-xs">
                              Pinned
                            </Badge>
                          )}
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {relativeDate(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {msg.content}
                      </p>
                    </div>
                  ))}
                  {messages.length > 5 && (
                    <p className="text-muted-foreground text-center text-sm pt-2">
                      Showing 5 of {messages.length} messages.{" "}
                      <Link
                        href={`/dashboard/projects/${projectId}/messages`}
                        className="text-primary underline"
                      >
                        View all
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
