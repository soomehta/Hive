"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrg } from "@/hooks/use-org";
import { apiClient } from "@/lib/utils/api-client";
import { plainTextFromDoc } from "@/lib/utils/page-content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageEditor } from "@/components/editor/page-editor";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Save,
  Loader2,
  History,
  Link2,
  RotateCcw,
  X,
  Smile,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import type { MentionItem } from "@/components/editor/mention-suggestion";
import { BacklinksPanel } from "@/components/shared/backlinks-panel";

type Item = { id: string; title: string; type: string; projectId: string | null };
type PageData = {
  id: string;
  itemId: string;
  contentJson: Record<string, unknown>;
  plainText: string;
  icon: string | null;
  coverUrl: string | null;
  lastEditedBy: string;
  updatedAt: string;
};

type Revision = {
  id: string;
  pageId: string;
  createdBy: string;
  plainText: string;
  createdAt: string;
};

type ActivityEntry = {
  id: string;
  type: string;
  userId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type Backlink = {
  id: string;
  fromItemId: string;
  toItemId: string;
  relationType: string;
  createdAt: string;
};

interface PageEditorClientProps {
  itemId: string;
}

const defaultContentJson: Record<string, unknown> = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function PageEditorClient({ itemId }: PageEditorClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orgId } = useOrg();
  const [contentJson, setContentJson] = useState<Record<string, unknown>>(defaultContentJson);
  const [plainText, setPlainText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [icon, setIcon] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCoverInput, setShowCoverInput] = useState(false);
  const initialLoaded = useRef(false);

  // Side panels
  const [showRevisions, setShowRevisions] = useState(false);
  const [showBacklinks, setShowBacklinks] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  // ─── Item + Page queries ──────────────────────────────
  const { data: item, isLoading: itemLoading, error: itemError } = useQuery({
    queryKey: ["item", orgId, itemId],
    queryFn: async () => {
      const res = await apiClient(`/api/items/${itemId}`);
      if (!res.ok) throw new Error("Failed to load item");
      const json = (await res.json()) as { data: Item };
      return json.data;
    },
    enabled: !!orgId && !!itemId,
  });

  const { data: page, isLoading: pageLoading } = useQuery({
    queryKey: ["page", orgId, itemId],
    queryFn: async () => {
      const res = await apiClient(`/api/pages/${itemId}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load page");
      const json = (await res.json()) as { data: PageData };
      return json.data;
    },
    enabled: !!orgId && !!itemId,
  });

  // ─── Revisions query ──────────────────────────────────
  const { data: revisions = [] } = useQuery({
    queryKey: ["page-revisions", orgId, itemId],
    queryFn: async () => {
      const res = await apiClient(`/api/pages/${itemId}/revisions`);
      if (!res.ok) return [];
      const json = (await res.json()) as { data: Revision[] };
      return json.data;
    },
    enabled: !!orgId && !!itemId && showRevisions,
  });

  // ─── Backlinks query ──────────────────────────────────
  const { data: backlinks = [] } = useQuery({
    queryKey: ["item-backlinks", orgId, itemId],
    queryFn: async () => {
      const res = await apiClient(`/api/items/${itemId}/backlinks`);
      if (!res.ok) return [];
      const json = (await res.json()) as { data: Backlink[] };
      return json.data;
    },
    enabled: !!orgId && !!itemId && showBacklinks,
  });

  // ─── Activity query ──────────────────────────────────
  const { data: activityData } = useQuery({
    queryKey: ["page-activity", orgId, itemId],
    queryFn: async () => {
      const res = await apiClient(`/api/activity?limit=20`);
      if (!res.ok) return [];
      const json = (await res.json()) as { data: ActivityEntry[] };
      // Filter to entries related to this item
      return json.data.filter(
        (a) => (a.metadata as Record<string, unknown>)?.itemId === itemId
      );
    },
    enabled: !!orgId && !!itemId && showActivity,
  });
  const pageActivity = activityData ?? [];

  // ─── Init editor content ──────────────────────────────
  useEffect(() => {
    if (page && !initialLoaded.current) {
      const doc = page.contentJson && Object.keys(page.contentJson).length > 0
        ? page.contentJson
        : defaultContentJson;
      setContentJson(doc);
      setPlainText(page.plainText || plainTextFromDoc(doc));
      setIcon(page.icon ?? null);
      setCoverUrl(page.coverUrl ?? null);
      initialLoaded.current = true;
    } else if (!pageLoading && item && !page) {
      setContentJson(defaultContentJson);
      setPlainText("");
      initialLoaded.current = true;
    }
  }, [page, pageLoading, item]);

  // ─── Mention query callbacks ─────────────────────────
  const queryUsers = useCallback(
    async (query: string): Promise<MentionItem[]> => {
      if (!orgId) return [];
      const res = await apiClient(`/api/organizations/members?search=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const json = (await res.json()) as { data: Array<{ userId: string; name?: string; email?: string }> };
      return json.data
        .filter((m) => {
          const label = m.name || m.email || m.userId;
          return label.toLowerCase().includes(query.toLowerCase());
        })
        .slice(0, 10)
        .map((m) => ({ id: m.userId, label: m.name || m.email || m.userId }));
    },
    [orgId],
  );

  const queryItems = useCallback(
    async (query: string): Promise<MentionItem[]> => {
      if (!orgId) return [];
      const res = await apiClient(`/api/items?search=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const json = (await res.json()) as { data: Array<{ id: string; title: string }> };
      return json.data
        .filter((i) => i.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10)
        .map((i) => ({ id: i.id, label: i.title }));
    },
    [orgId],
  );

  // ─── Autosave debounce ref ──────────────────────────
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContent = useRef({ contentJson, plainText });

  const handleEditorChange = useCallback((nextJson: Record<string, unknown>, nextPlain: string) => {
    setContentJson(nextJson);
    setPlainText(nextPlain);
    setDirty(true);
    latestContent.current = { contentJson: nextJson, plainText: nextPlain };

    // Debounced autosave (draft, no revision) after 2s of inactivity
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      autosaveMutation.mutate(latestContent.current);
    }, 2000);
  }, []);

  // Cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  // ─── Autosave mutation (draft, no revision) ─────────
  const autosaveMutation = useMutation({
    mutationFn: async (payload: { contentJson: Record<string, unknown>; plainText: string }) => {
      const res = await apiClient(`/api/pages/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({
          contentJson: payload.contentJson,
          plainText: payload.plainText,
          icon,
          coverUrl,
          createRevision: false,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Autosave failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setDirty(false);
    },
    onError: () => {
      toast.error("Autosave failed — your changes may not be saved. Try saving manually.");
    },
  });

  // ─── Save mutation (manual, creates revision) ──────
  const saveMutation = useMutation({
    mutationFn: async (payload: { contentJson: Record<string, unknown>; plainText: string }) => {
      // Cancel any pending autosave
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      const res = await apiClient(`/api/pages/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({
          contentJson: payload.contentJson,
          plainText: payload.plainText,
          icon,
          coverUrl,
          createRevision: true,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page", orgId, itemId] });
      queryClient.invalidateQueries({ queryKey: ["page-revisions", orgId, itemId] });
      setDirty(false);
      toast.success("Page saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // ─── Restore revision mutation ────────────────────────
  const restoreMutation = useMutation({
    mutationFn: async (revisionId: string) => {
      const res = await apiClient(`/api/pages/${itemId}/restore`, {
        method: "POST",
        body: JSON.stringify({ revisionId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to restore");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page", orgId, itemId] });
      queryClient.invalidateQueries({ queryKey: ["page-revisions", orgId, itemId] });
      initialLoaded.current = false; // Force re-init editor content
      toast.success("Revision restored");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSave = useCallback(() => {
    saveMutation.mutate({ contentJson, plainText });
  }, [contentJson, plainText, saveMutation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (dirty) handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dirty, handleSave]);

  // ─── Error / Loading states ───────────────────────────
  if (itemError || (item && item.type !== "page")) {
    return (
      <div className="space-y-4">
        <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Page" }]} />
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Page not found or invalid.
            <Link href="/dashboard" className="block mt-2 text-primary hover:underline">
              Back to Dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (itemLoading || !item) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Pages", href: "/dashboard/pages" },
          { label: item.title },
        ]}
      />

      <div className="flex gap-4">
        {/* ─── Main editor card ─── */}
        <Card className="flex-1">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-xl">{item.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={showRevisions ? "secondary" : "outline"}
                onClick={() => {
                  setShowRevisions(!showRevisions);
                  setShowBacklinks(false);
                }}
              >
                <History className="size-4 mr-1" />
                Revisions
              </Button>
              <Button
                size="sm"
                variant={showBacklinks ? "secondary" : "outline"}
                onClick={() => {
                  setShowBacklinks(!showBacklinks);
                  setShowRevisions(false);
                }}
              >
                <Link2 className="size-4 mr-1" />
                Backlinks
              </Button>
              <Button
                size="sm"
                variant={showActivity ? "secondary" : "outline"}
                onClick={() => setShowActivity(!showActivity)}
              >
                Activity
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/pages">
                  <ArrowLeft className="size-4 mr-1" />
                  Back
                </Link>
              </Button>
              <Button
                size="sm"
                disabled={!dirty || saveMutation.isPending}
                onClick={handleSave}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin mr-1" />
                ) : (
                  <Save className="size-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          </CardHeader>

          {/* ─── Cover image ─── */}
          {coverUrl && (
            <div className="relative h-40 w-full overflow-hidden">
              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 size-7"
                onClick={() => { setCoverUrl(null); setDirty(true); }}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          )}

          {/* ─── Icon + cover controls ─── */}
          <div className="px-6 pt-4 flex items-center gap-3">
            {/* Icon display / picker toggle */}
            <button
              className="text-4xl hover:opacity-70 transition-opacity"
              onClick={() => setShowIconPicker(!showIconPicker)}
              title="Change icon"
            >
              {icon || <Smile className="size-8 text-muted-foreground" />}
            </button>

            {!coverUrl && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCoverInput(!showCoverInput)}
              >
                <ImageIcon className="size-4 mr-1" />
                Add cover
              </Button>
            )}

            {icon && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setIcon(null); setDirty(true); }}
              >
                Remove icon
              </Button>
            )}
          </div>

          {/* ─── Icon picker (simple emoji grid) ─── */}
          {showIconPicker && (
            <div className="px-6 py-2">
              <div className="rounded-md border bg-background p-3 max-w-xs">
                <p className="text-xs text-muted-foreground mb-2">Pick an emoji icon</p>
                <div className="flex flex-wrap gap-1">
                  {["📋", "📝", "📄", "📊", "📈", "🎯", "💡", "🔧", "🚀", "⭐", "🏗️", "📌", "🔖", "🗂️", "📁", "🧩", "🎨", "🔬", "📡", "🛠️"].map((emoji) => (
                    <button
                      key={emoji}
                      className="text-2xl hover:bg-muted rounded p-1"
                      onClick={() => {
                        setIcon(emoji);
                        setDirty(true);
                        setShowIconPicker(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Cover URL input ─── */}
          {showCoverInput && (
            <div className="px-6 py-2">
              <div className="flex gap-2 max-w-md">
                <Input
                  placeholder="Paste image URL…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) {
                        setCoverUrl(val);
                        setDirty(true);
                        setShowCoverInput(false);
                      }
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCoverInput(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <CardContent>
            {pageLoading && !page ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <PageEditor
                key={itemId}
                initialContent={page?.contentJson ?? defaultContentJson}
                onChange={handleEditorChange}
                editable={true}
                className="rounded-md border bg-background"
                onQueryUsers={queryUsers}
                onQueryItems={queryItems}
              />
            )}
            {page && (
              <div className="flex items-center gap-2 mt-2">
                <p className="text-xs text-muted-foreground">
                  Last edited {new Date(page.updatedAt).toLocaleString()}
                </p>
                {autosaveMutation.isPending && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" /> Saving draft…
                  </span>
                )}
                {autosaveMutation.isError && (
                  <span className="text-xs text-destructive flex items-center gap-1">
                    Autosave failed — save manually
                  </span>
                )}
                {!dirty && !autosaveMutation.isPending && !autosaveMutation.isError && !saveMutation.isPending && (
                  <span className="text-xs text-green-600">Saved</span>
                )}
              </div>
            )}
            {/* ─── Activity feed ─── */}
            {showActivity && (
              <div className="mt-4 border-t pt-4">
                <h3 className="text-sm font-medium mb-2">Recent Activity</h3>
                {pageActivity.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No activity recorded for this page yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {pageActivity.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-[10px]">
                          {a.type.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-muted-foreground">
                          {new Date(a.createdAt).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Revisions panel ─── */}
        {showRevisions && (
          <Card className="w-72 shrink-0">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <History className="size-4" />
                Revision History
              </CardTitle>
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                onClick={() => setShowRevisions(false)}
              >
                <X className="size-3" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {revisions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No revisions yet. Save your page to create one.
                </p>
              ) : (
                revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-md border bg-background p-2 space-y-1"
                  >
                    <p className="text-xs font-medium">
                      {new Date(rev.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {rev.plainText?.slice(0, 120) || "(empty)"}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-1"
                      disabled={restoreMutation.isPending}
                      onClick={() => restoreMutation.mutate(rev.id)}
                    >
                      <RotateCcw className="size-3 mr-1" />
                      Restore
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Backlinks panel ─── */}
        {showBacklinks && (
          <BacklinksPanel
            backlinks={backlinks}
            onClose={() => setShowBacklinks(false)}
          />
        )}
      </div>
    </div>
  );
}
