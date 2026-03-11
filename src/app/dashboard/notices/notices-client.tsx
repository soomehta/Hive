"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useOrg } from "@/hooks/use-org";
import { apiClient } from "@/lib/utils/api-client";
import { Button } from "@/components/ui/button";
import { PlusSquare } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";
import { NoticeComposer, type NoticePayload } from "@/components/notices/notice-composer";
import { NoticeBoard } from "@/components/notices/notice-board";
import type { Notice } from "@/components/notices/notice-board";

export function NoticesClient() {
  const queryClient = useQueryClient();
  const { orgId } = useOrg();
  const [showForm, setShowForm] = useState(false);

  const { data: notices = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["notices", orgId],
    queryFn: async () => {
      const res = await apiClient("/api/notices");
      if (!res.ok) throw new Error("Failed to fetch notices");
      const json = (await res.json()) as { data: Notice[] };
      return json.data;
    },
    enabled: !!orgId,
    refetchInterval: 30_000,
  });

  const createNotice = useMutation({
    mutationFn: async (payload: NoticePayload) => {
      const res = await apiClient("/api/notices", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to create notice");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices", orgId] });
      setShowForm(false);
      toast.success("Notice posted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const togglePin = useMutation({
    mutationFn: async (noticeId: string) => {
      const res = await apiClient(`/api/notices/${noticeId}/pin`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to toggle pin");
      }
      return res.json();
    },
    onMutate: async (noticeId) => {
      await queryClient.cancelQueries({ queryKey: ["notices", orgId] });
      const previous = queryClient.getQueryData<Notice[]>(["notices", orgId]);
      queryClient.setQueryData<Notice[]>(["notices", orgId], (old) =>
        old?.map((n) => (n.id === noticeId ? { ...n, isPinned: !n.isPinned } : n))
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices", orgId] });
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["notices", orgId], context.previous);
      toast.error("Something went wrong. Please try again.");
    },
  });

  const archiveNotice = useMutation({
    mutationFn: async (noticeId: string) => {
      const res = await apiClient(`/api/notices/${noticeId}/archive`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to archive notice");
      }
      return res.json();
    },
    onMutate: async (noticeId) => {
      await queryClient.cancelQueries({ queryKey: ["notices", orgId] });
      const previous = queryClient.getQueryData<Notice[]>(["notices", orgId]);
      queryClient.setQueryData<Notice[]>(["notices", orgId], (old) =>
        old?.filter((n) => n.id !== noticeId)
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices", orgId] });
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["notices", orgId], context.previous);
      toast.error("Something went wrong. Please try again.");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Notices</h1>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <PlusSquare className="size-4 mr-1" />
          {showForm ? "Cancel" : "New Notice"}
        </Button>
      </div>

      {showForm && (
        <NoticeComposer
          onSubmit={(payload) => createNotice.mutate(payload)}
          isSubmitting={createNotice.isPending}
        />
      )}

      {isError ? (
        <ErrorState
          message="Failed to load notices."
          onRetry={() => refetch()}
        />
      ) : (
        <NoticeBoard
          notices={notices}
          isLoading={isLoading}
          onTogglePin={(id) => togglePin.mutate(id)}
          onArchive={(id) => archiveNotice.mutate(id)}
        />
      )}
    </div>
  );
}
