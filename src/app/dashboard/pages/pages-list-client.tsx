"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrg } from "@/hooks/use-org";
import { apiClient } from "@/lib/utils/api-client";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Plus, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils/dates";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { useState } from "react";
import { Input } from "@/components/ui/input";

type PageItem = {
  id: string;
  title: string;
  type: string;
  projectId: string | null;
  ownerId: string;
  updatedAt: string;
  createdAt: string;
};

export function PagesListClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orgId } = useOrg();
  const [showCreate, setShowCreate] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");

  const { data: pages, isLoading, isError, refetch } = useQuery({
    queryKey: ["pages-list", orgId],
    queryFn: async () => {
      const res = await apiClient("/api/pages");
      if (!res.ok) throw new Error("Failed to load pages");
      const json = (await res.json()) as { data: PageItem[] };
      return json.data;
    },
    enabled: !!orgId,
  });

  const createPage = useMutation({
    mutationFn: async () => {
      // Create item first
      const itemRes = await apiClient("/api/items", {
        method: "POST",
        body: JSON.stringify({
          type: "page",
          title: newPageTitle.trim(),
        }),
      });
      if (!itemRes.ok) {
        const json = await itemRes.json();
        throw new Error(json.error || "Failed to create page");
      }
      const { data: item } = (await itemRes.json()) as { data: { id: string } };

      // Create page content
      const pageRes = await apiClient(`/api/pages/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          contentJson: { type: "doc", content: [{ type: "paragraph" }] },
          plainText: "",
          createRevision: false,
        }),
      });
      if (!pageRes.ok) throw new Error("Failed to initialize page");

      return item;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["pages-list", orgId] });
      setNewPageTitle("");
      setShowCreate(false);
      router.push(`/dashboard/pages/${item.id}`);
      toast.success("Page created");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Pages" },
        ]}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="size-5" />
              Pages
            </CardTitle>
            <CardDescription>
              Your canvas pages. Create a new page or open a task/project as a page.
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus className="size-4 mr-1" />
            New Page
          </Button>
        </CardHeader>
        <CardContent>
          {showCreate && (
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Page title..."
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newPageTitle.trim()) {
                    createPage.mutate();
                  }
                }}
              />
              <Button
                disabled={!newPageTitle.trim() || createPage.isPending}
                onClick={() => createPage.mutate()}
              >
                {createPage.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : isError ? (
            <ErrorState
              message="Failed to load pages."
              onRetry={() => refetch()}
            />
          ) : !pages?.length ? (
            <div className="rounded-lg border border-dashed bg-muted/30 py-12 text-center text-muted-foreground">
              <FileText className="mx-auto size-10 opacity-50" />
              <p className="mt-2 font-medium">No pages yet</p>
              <p className="text-sm mt-1">
                Click &ldquo;New Page&rdquo; to create one, or open a task/project as a page.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {pages.map((page) => (
                <li key={page.id}>
                  <Link
                    href={`/dashboard/pages/${page.id}`}
                    className="flex items-center justify-between gap-4 py-3 px-2 -mx-2 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate" title={page.title}>{page.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      Updated {formatDate(page.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
