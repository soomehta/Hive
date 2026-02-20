"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Save } from "lucide-react";
import { toast } from "sonner";

// ─── Loading Skeleton ───────────────────────────────────

function ProfileSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

// ─── Page ───────────────────────────────────────────────

export default function ProfilePage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["auth-user-profile"],
    queryFn: async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
  });

  const fullName =
    user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "";
  const email = user?.email ?? "";

  const [editName, setEditName] = useState<string | null>(null);
  const isEditing = editName !== null;
  const nameValue = editName ?? fullName;

  const updateNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: newName },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setEditName(null);
      queryClient.invalidateQueries({ queryKey: ["auth-user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const handleSave = () => {
    if (editName === null) return;
    updateNameMutation.mutate(editName.trim());
  };

  const handleCancel = () => {
    setEditName(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information
          </p>
        </div>
        <ProfileSkeleton />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information
          </p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load profile. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const initials = (fullName || email)
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Your profile details visible across the organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar and Name Display */}
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {initials}
            </div>
            <div>
              <p className="text-lg font-medium">{fullName || "No name set"}</p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Mail className="size-3.5" />
                {email}
              </div>
            </div>
          </div>

          <Separator />

          {/* Edit Name */}
          <div className="space-y-2">
            <Label htmlFor="full-name">Full Name</Label>
            <div className="flex gap-2">
              <Input
                id="full-name"
                value={nameValue}
                onChange={(e) => setEditName(e.target.value)}
                onFocus={() => {
                  if (editName === null) setEditName(fullName);
                }}
                placeholder="Enter your full name"
              />
              {isEditing && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={
                      updateNameMutation.isPending ||
                      editName.trim() === fullName
                    }
                  >
                    {updateNameMutation.isPending ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save className="size-4" />
                        Save
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={updateNameMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed from here. Contact support for email
              changes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Metadata about your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                User ID
              </p>
              <p className="text-sm font-mono break-all">{user.id}</p>
            </div>
            {user.created_at && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Account Created
                </p>
                <p className="text-sm">
                  {new Date(user.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
            {user.last_sign_in_at && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Last Sign In
                </p>
                <p className="text-sm">
                  {new Date(user.last_sign_in_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
            {user.app_metadata?.provider && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Auth Provider
                </p>
                <p className="text-sm capitalize">
                  {user.app_metadata.provider}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
