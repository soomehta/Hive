"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Settings,
  BarChart3,
  Plug,
  Bot,
  Plus,
  Sun,
  Moon,
  Monitor,
  FileText,
  MessageSquare,
  StickyNote,
  Loader2,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { apiClient } from "@/lib/utils/api-client";

// ─── Types ────────────────────────────────────────────────

interface TaskResult {
  type: "task";
  id: string;
  title: string;
  snippet: string;
  status: string;
  priority: string;
  projectId: string;
  updatedAt: string;
}

interface ProjectResult {
  type: "project";
  id: string;
  title: string;
  snippet: string;
  status: string;
  updatedAt: string;
}

interface PageResult {
  type: "page";
  id: string;
  title: string;
  snippet: string;
  updatedAt: string;
}

interface ChatResult {
  type: "chat_message";
  id: string;
  channelId: string;
  snippet: string;
  authorId: string;
  createdAt: string;
}

interface NoticeResult {
  type: "notice";
  id: string;
  title: string;
  snippet: string;
  status: string;
  createdAt: string;
}

interface SearchResults {
  tasks?: TaskResult[];
  projects?: ProjectResult[];
  pages?: PageResult[];
  chat?: ChatResult[];
  notices?: NoticeResult[];
}

// ─── Component ────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({});
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { setTheme } = useTheme();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Clear state when dialog closes so next open starts fresh
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({});
      setIsSearching(false);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    }
  }, [open]);

  const runSearch = useCallback(async (q: string) => {
    setIsSearching(true);
    try {
      const res = await apiClient(
        `/api/search?q=${encodeURIComponent(q)}&types=tasks,projects,pages,chat,notices&limit=5`
      );
      if (!res.ok) {
        setResults({});
        return;
      }
      const json = await res.json();
      setResults((json.data as SearchResults) ?? {});
    } catch {
      setResults({});
    } finally {
      setIsSearching(false);
    }
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < 2) {
      setResults({});
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      runSearch(value);
    }, 300);
  }

  function runCommand(fn: () => void) {
    setOpen(false);
    fn();
  }

  const hasResults =
    (results.tasks?.length ?? 0) > 0 ||
    (results.projects?.length ?? 0) > 0 ||
    (results.pages?.length ?? 0) > 0 ||
    (results.chat?.length ?? 0) > 0 ||
    (results.notices?.length ?? 0) > 0;

  const isLiveSearch = query.length >= 2;

  return (
    <CommandDialog open={open} onOpenChange={setOpen} showCloseButton={false}>
      <CommandInput
        placeholder="Type a command or search..."
        value={query}
        onValueChange={handleQueryChange}
      />
      <CommandList>
        {/* ── Live search mode ─────────────────────────────── */}
        {isLiveSearch ? (
          <>
            {isSearching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Searching...
              </div>
            ) : !hasResults ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : (
              <>
                {(results.tasks?.length ?? 0) > 0 && (
                  <CommandGroup heading="Tasks">
                    {results.tasks!.map((task) => (
                      <CommandItem
                        key={task.id}
                        value={`task-${task.id}`}
                        onSelect={() =>
                          runCommand(() =>
                            router.push(
                              task.projectId
                                ? `/dashboard/projects/${task.projectId}/tasks`
                                : "/dashboard/my-tasks"
                            )
                          )
                        }
                      >
                        <CheckSquare className="size-4 shrink-0" />
                        <span className="truncate">{task.title}</span>
                        {task.snippet && (
                          <span className="ml-auto truncate text-xs text-muted-foreground">
                            {task.snippet}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {(results.projects?.length ?? 0) > 0 && (
                  <CommandGroup heading="Projects">
                    {results.projects!.map((project) => (
                      <CommandItem
                        key={project.id}
                        value={`project-${project.id}`}
                        onSelect={() =>
                          runCommand(() =>
                            router.push(`/dashboard/projects/${project.id}`)
                          )
                        }
                      >
                        <FolderKanban className="size-4 shrink-0" />
                        <span className="truncate">{project.title}</span>
                        {project.snippet && (
                          <span className="ml-auto truncate text-xs text-muted-foreground">
                            {project.snippet}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {(results.pages?.length ?? 0) > 0 && (
                  <CommandGroup heading="Pages">
                    {results.pages!.map((page) => (
                      <CommandItem
                        key={page.id}
                        value={`page-${page.id}`}
                        onSelect={() =>
                          runCommand(() =>
                            router.push(`/dashboard/pages/${page.id}`)
                          )
                        }
                      >
                        <FileText className="size-4 shrink-0" />
                        <span className="truncate">{page.title}</span>
                        {page.snippet && (
                          <span className="ml-auto truncate text-xs text-muted-foreground">
                            {page.snippet}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {(results.chat?.length ?? 0) > 0 && (
                  <CommandGroup heading="Chat">
                    {results.chat!.map((msg) => (
                      <CommandItem
                        key={msg.id}
                        value={`chat-${msg.id}`}
                        onSelect={() =>
                          runCommand(() => router.push("/dashboard/chat"))
                        }
                      >
                        <MessageSquare className="size-4 shrink-0" />
                        <span className="truncate">{msg.snippet}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {(results.notices?.length ?? 0) > 0 && (
                  <CommandGroup heading="Notices">
                    {results.notices!.map((notice) => (
                      <CommandItem
                        key={notice.id}
                        value={`notice-${notice.id}`}
                        onSelect={() =>
                          runCommand(() => router.push("/dashboard/notices"))
                        }
                      >
                        <StickyNote className="size-4 shrink-0" />
                        <span className="truncate">{notice.title}</span>
                        {notice.snippet && (
                          <span className="ml-auto truncate text-xs text-muted-foreground">
                            {notice.snippet}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </>
        ) : (
          /* ── Static navigation mode ──────────────────────── */
          <>
            <CommandEmpty>No results found.</CommandEmpty>

            <CommandGroup heading="Navigation">
              <CommandItem
                onSelect={() => runCommand(() => router.push("/dashboard"))}
              >
                <LayoutDashboard className="size-4" />
                Dashboard
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/dashboard/projects"))
                }
              >
                <FolderKanban className="size-4" />
                Projects
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/dashboard/my-tasks"))
                }
              >
                <CheckSquare className="size-4" />
                My Tasks
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/dashboard/reports"))
                }
              >
                <BarChart3 className="size-4" />
                Reports
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/dashboard/integrations"))
                }
              >
                <Plug className="size-4" />
                Integrations
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/dashboard/team"))
                }
              >
                <Users className="size-4" />
                Team
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/dashboard/settings/bees"))
                }
              >
                <Bot className="size-4" />
                Bees
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/dashboard/settings"))
                }
              >
                <Settings className="size-4" />
                Settings
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={() =>
                  runCommand(() => router.push("/dashboard/projects/new"))
                }
              >
                <Plus className="size-4" />
                New Project
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Theme">
              <CommandItem
                onSelect={() => runCommand(() => setTheme("light"))}
              >
                <Sun className="size-4" />
                Light
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
                <Moon className="size-4" />
                Dark
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => setTheme("system"))}
              >
                <Monitor className="size-4" />
                System
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
