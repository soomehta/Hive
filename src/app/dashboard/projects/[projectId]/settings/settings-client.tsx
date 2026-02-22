"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
import { PROJECT_COLORS, PROJECT_STATUS_LABELS } from "@/lib/utils/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Settings, Trash2, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/types";

// ─── Form Schema ─────────────────────────────────────────

const projectSettingsSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(5000).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .optional(),
  status: z.enum(["active", "paused", "completed", "archived"]),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
});

type ProjectSettingsFormValues = z.infer<typeof projectSettingsSchema>;

// ─── Helpers ─────────────────────────────────────────────

/** Convert an ISO datetime string to the "YYYY-MM-DD" value an <input type="date"> expects. */
function isoToDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

/** Convert a "YYYY-MM-DD" string from a date input to an ISO datetime string, or undefined if empty. */
function dateInputToIso(value: string): string | undefined {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

// ─── Delete Confirmation Dialog ──────────────────────────

function DeleteProjectDialog({
  projectName,
  onConfirm,
  isPending,
}: {
  projectName: string;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const canDelete = confirmText === projectName;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setConfirmText("");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="size-4" />
          Delete Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the
            project, all its tasks, messages, and activity history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              All tasks, comments, messages, and member associations for this
              project will be permanently deleted.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Type{" "}
              <span className="font-semibold text-foreground">
                {projectName}
              </span>{" "}
              to confirm:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={projectName}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              handleOpenChange(false);
            }}
            disabled={!canDelete || isPending}
          >
            {isPending ? "Deleting..." : "Delete Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Loading Skeleton ────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-9 w-full" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </CardContent>
        <CardFooter>
          <Skeleton className="h-9 w-32" />
        </CardFooter>
      </Card>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────

export function ProjectSettingsClient() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { orgId } = useOrg();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: project,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await apiClient(`/api/projects/${projectId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch project");
      }
      const json = await res.json();
      return json.data as Project;
    },
    enabled: !!orgId && !!projectId,
  });

  const form = useForm<ProjectSettingsFormValues>({
    resolver: zodResolver(projectSettingsSchema),
    values: project
      ? {
          name: project.name,
          description: project.description ?? "",
          color: project.color ?? PROJECT_COLORS[0],
          status: project.status,
          startDate: isoToDateInputValue(project.startDate?.toString()),
          targetDate: isoToDateInputValue(project.targetDate?.toString()),
        }
      : {
          name: "",
          description: "",
          color: PROJECT_COLORS[0],
          status: "active",
          startDate: "",
          targetDate: "",
        },
  });

  const selectedColor = form.watch("color");

  const updateMutation = useMutation({
    mutationFn: async (data: ProjectSettingsFormValues) => {
      const body: Record<string, unknown> = {
        name: data.name,
        status: data.status,
      };

      // Only include optional fields when they have values
      if (data.description !== undefined) {
        body.description = data.description || null;
      }
      if (data.color) {
        body.color = data.color;
      }
      if (data.startDate) {
        body.startDate = dateInputToIso(data.startDate);
      } else {
        body.startDate = null;
      }
      if (data.targetDate) {
        body.targetDate = dateInputToIso(data.targetDate);
      } else {
        body.targetDate = null;
      }

      const res = await apiClient(`/api/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update project");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Project updated successfully");
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete project");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Project deleted");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push("/dashboard/projects");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (data: ProjectSettingsFormValues) => {
    updateMutation.mutate(data);
  };

  if (!orgId || isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects", href: "/dashboard/projects" },
            { label: "Project", href: `/dashboard/projects/${projectId}` },
            { label: "Settings" },
          ]}
        />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Project Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your project configuration
          </p>
        </div>
        <SettingsSkeleton />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Projects", href: "/dashboard/projects" },
            { label: "Settings" },
          ]}
        />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Project Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your project configuration
          </p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load project settings. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects", href: "/dashboard/projects" },
          {
            label: project.name,
            href: `/dashboard/projects/${projectId}`,
          },
          { label: "Settings" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Project Settings</h1>
        <p className="text-muted-foreground">
          Manage your project configuration
        </p>
      </div>

      {/* ── Project Details Card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            Project Details
          </CardTitle>
          <CardDescription>
            Update the name, description, color, status, and dates for this
            project.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-5">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Project Name{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Website Redesign" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the goals and scope of this project..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Color Picker */}
              <FormField
                control={form.control}
                name="color"
                render={() => (
                  <FormItem>
                    <FormLabel>Project Color</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {PROJECT_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                              selectedColor === color
                                ? "border-foreground scale-110"
                                : "border-transparent hover:scale-105"
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() =>
                              form.setValue("color", color, {
                                shouldDirty: true,
                              })
                            }
                            aria-label={`Select color ${color}`}
                          >
                            {selectedColor === color && (
                              <Check className="h-4 w-4 text-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(
                          Object.entries(PROJECT_STATUS_LABELS) as [
                            string,
                            string,
                          ][]
                        ).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dates */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={
                  updateMutation.isPending || !form.formState.isDirty
                }
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Separator />

      {/* ── Danger Zone Card ── */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that permanently affect this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
            <div>
              <p className="text-sm font-medium">Delete this project</p>
              <p className="text-sm text-muted-foreground">
                Once deleted, all tasks, messages, and data will be permanently
                removed.
              </p>
            </div>
            <DeleteProjectDialog
              projectName={project.name}
              onConfirm={() => deleteMutation.mutate()}
              isPending={deleteMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
