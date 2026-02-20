"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { apiClient } from "@/lib/utils/api-client";
import { useOrg } from "@/hooks/use-org";
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
import { Plus, MessageSquare, Pin } from "lucide-react";
import type { Message } from "@/types";

type MessageFormValues = z.infer<typeof createMessageSchema>;

export default function ProjectMessagesPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { orgId } = useOrg();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);

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
      queryClient.invalidateQueries({
        queryKey: ["project-messages", projectId],
      });
      setSheetOpen(false);
      reset();
    },
  });

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
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
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
          {sortedMessages.map((msg) => (
            <Card key={msg.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {msg.userId.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      {msg.title ? (
                        <CardTitle className="text-base">
                          {msg.title}
                        </CardTitle>
                      ) : (
                        <CardTitle className="text-base text-muted-foreground italic">
                          Untitled message
                        </CardTitle>
                      )}
                      <CardDescription className="text-xs">
                        {msg.userId} &middot;{" "}
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
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
