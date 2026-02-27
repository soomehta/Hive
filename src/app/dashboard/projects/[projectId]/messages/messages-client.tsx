"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
import { createClient } from "@/lib/supabase/client";
import { createMessageSchema } from "@/lib/utils/validation";
import { relativeDate } from "@/lib/utils/dates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, MessageSquare, Pin, MoreVertical, Pencil, Trash2, PinOff } from "lucide-react";
import type { Message } from "@/types";
import { getUserDisplayName, getUserInitials } from "@/lib/utils/user-display";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { toast } from "sonner";

type MessageFormValues = z.infer<typeof createMessageSchema>;

export function PageClient() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { orgId } = useOrg();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    }
    fetchUser();
  }, []);

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
    data: messages,
    isLoading,
  } = useQuery({
    queryKey: ["project-messages", projectId, orgId],
    queryFn: async () => {
      const res = await apiClient(`/api/messages?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const json = await res.json();
      return json.data as Message[];
    },
    enabled: !!orgId && !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: MessageFormValues) => {
      const res = await apiClient("/api/messages", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to create message");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Message posted");
      queryClient.invalidateQueries({
        queryKey: ["project-messages", projectId],
      });
      setSheetOpen(false);
      reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to post message");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ messageId, data }: { messageId: string; data: { title?: string | null; content?: string } }) => {
      const res = await apiClient(`/api/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update message");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Message updated");
      queryClient.invalidateQueries({ queryKey: ["project-messages", projectId] });
      setEditingId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update message");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await apiClient(`/api/messages/${messageId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete message");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Message deleted");
      queryClient.invalidateQueries({ queryKey: ["project-messages", projectId] });
      setDeleteConfirmId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete message");
    },
  });

  const pinMutation = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      const res = await apiClient(`/api/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ isPinned }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update pin");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast.success(variables.isPinned ? "Message pinned" : "Message unpinned");
      queryClient.invalidateQueries({ queryKey: ["project-messages", projectId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to toggle pin");
    },
  });

  function startEditing(msg: Message) {
    setEditingId(msg.id);
    setEditContent(msg.content);
    setEditTitle(msg.title ?? "");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditContent("");
    setEditTitle("");
  }

  function saveEdit(messageId: string) {
    updateMutation.mutate({
      messageId,
      data: { title: editTitle || null, content: editContent },
    });
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MessageFormValues>({
    resolver: zodResolver(createMessageSchema),
    defaultValues: {
      projectId,
      title: "",
      content: "",
    },
  });

  function onSubmit(data: MessageFormValues) {
    createMutation.mutate(data);
  }

  // Sort messages: pinned first, then newest first
  const sortedMessages = messages
    ? [...messages].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
    : [];

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
          { label: "Messages" },
        ]}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground text-sm">
            Team discussions and updates for this project
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          New Message
        </Button>
      </div>

      {/* Messages List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 sm:py-16">
          <MessageSquare className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="text-lg font-medium">No messages yet</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Start a conversation with your team.
          </p>
          <Button className="mt-4" onClick={() => setSheetOpen(true)}>
            <Plus className="h-4 w-4" />
            Post a Message
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMessages.map((msg) => {
            const isOwner = currentUserId === msg.userId;
            const isEditing = editingId === msg.id;

            return (
              <Card key={msg.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {getUserInitials(getUserDisplayName({ userId: msg.userId }))}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        {isEditing ? (
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Title (optional)"
                            className="h-8 text-base font-semibold"
                          />
                        ) : msg.title ? (
                          <CardTitle className="text-base">
                            {msg.title}
                          </CardTitle>
                        ) : (
                          <CardTitle className="text-base text-muted-foreground italic">
                            Untitled message
                          </CardTitle>
                        )}
                        <CardDescription className="text-xs">
                          {getUserDisplayName({ userId: msg.userId })} &middot;{" "}
                          {relativeDate(msg.createdAt)}
                          {msg.isFromPa && (
                            <Badge
                              variant="outline"
                              className="ml-2 text-xs"
                            >
                              PA
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {msg.isPinned && (
                        <Badge variant="secondary" className="gap-1">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Message actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isOwner && (
                            <DropdownMenuItem onClick={() => startEditing(msg)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => pinMutation.mutate({ messageId: msg.id, isPinned: !msg.isPinned })}
                          >
                            {msg.isPinned ? (
                              <>
                                <PinOff className="h-4 w-4 mr-2" />
                                Unpin
                              </>
                            ) : (
                              <>
                                <Pin className="h-4 w-4 mr-2" />
                                Pin
                              </>
                            )}
                          </DropdownMenuItem>
                          {isOwner && (
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirmId(msg.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEditing}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={!editContent.trim() || updateMutation.isPending}
                          onClick={() => saveEdit(msg.id)}
                        >
                          {updateMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this message. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Message Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Message</SheetTitle>
            <SheetDescription>
              Post a message to the team
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
              <Label htmlFor="msg-title">Title (optional)</Label>
              <Input
                id="msg-title"
                placeholder="Message title"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-destructive text-sm">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="msg-content">
                Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="msg-content"
                placeholder="Write your message..."
                rows={8}
                {...register("content")}
              />
              {errors.content && (
                <p className="text-destructive text-sm">
                  {errors.content.message}
                </p>
              )}
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
                {createMutation.isPending
                  ? "Posting..."
                  : "Post Message"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
