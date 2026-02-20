"use client";

import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface MessageComposerProps {
  projectId: string;
  onSuccess?: () => void;
}

export function MessageComposer({ projectId, onSuccess }: MessageComposerProps) {
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: { title: "", content: "" },
  });

  const mutation = useMutation({
    mutationFn: async (values: { title: string; content: string }) => {
      const res = await apiClient("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          title: values.title || undefined,
          content: values.content,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to post message");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast.success("Message posted");
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      className="space-y-3"
    >
      <div className="space-y-1">
        <Label htmlFor="msg-title">Title (optional)</Label>
        <Input
          id="msg-title"
          {...form.register("title")}
          placeholder="Message title"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="msg-content">Message</Label>
        <Textarea
          id="msg-content"
          {...form.register("content", { required: true })}
          placeholder="Write your message..."
          rows={4}
        />
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Posting..." : "Post Message"}
      </Button>
    </form>
  );
}
