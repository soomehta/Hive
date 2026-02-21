"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Settings, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Form Schema ────────────────────────────────────────

const orgSettingsSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Only lowercase letters, numbers, and hyphens allowed"
    ),
});

type OrgSettingsFormValues = z.infer<typeof orgSettingsSchema>;

// ─── Delete Confirmation Dialog ─────────────────────────

function DeleteOrgDialog({
  orgName,
  onConfirm,
  isPending,
}: {
  orgName: string;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const canDelete = confirmText === orgName;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="size-4" />
          Delete Organization
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Organization</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the
            organization, all projects, tasks, and data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              All projects, tasks, messages, and member data will be permanently
              deleted.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-semibold text-foreground">{orgName}</span> to
              confirm:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={orgName}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
            disabled={!canDelete || isPending}
          >
            {isPending ? "Deleting..." : "Delete Organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Loading Skeleton ───────────────────────────────────

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
          <Skeleton className="h-9 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-9 w-32" />
        </CardFooter>
      </Card>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────

export function PageClient() {
  const { orgId, clearOrg, setOrg } = useOrg();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: org,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      const res = await apiClient(`/api/organizations/${orgId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch organization");
      }
      const json = await res.json();
      return json.data as Organization;
    },
    enabled: !!orgId,
  });

  const form = useForm<OrgSettingsFormValues>({
    resolver: zodResolver(orgSettingsSchema),
    values: org
      ? { name: org.name, slug: org.slug }
      : { name: "", slug: "" },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: OrgSettingsFormValues) => {
      const res = await apiClient(`/api/organizations/${orgId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update organization");
      }
      return res.json();
    },
    onSuccess: (json) => {
      const updated = json.data as Organization;
      toast.success("Organization updated successfully");
      setOrg(updated.id, updated.name);
      queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient(`/api/organizations/${orgId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete organization");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Organization deleted");
      clearOrg();
      router.push("/onboarding");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: OrgSettingsFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization settings
          </p>
        </div>
        <SettingsSkeleton />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization settings
          </p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load organization settings. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            Organization Details
          </CardTitle>
          <CardDescription>
            Update your organization name and URL slug.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Organization" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="my-organization" {...field} />
                    </FormControl>
                    <FormDescription>
                      Only lowercase letters, numbers, and hyphens.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={updateMutation.isPending || !form.formState.isDirty}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Separator />

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your entire organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
            <div>
              <p className="text-sm font-medium">Delete this organization</p>
              <p className="text-sm text-muted-foreground">
                Once deleted, all data will be permanently removed.
              </p>
            </div>
            <DeleteOrgDialog
              orgName={org.name}
              onConfirm={() => deleteMutation.mutate()}
              isPending={deleteMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
