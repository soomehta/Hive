"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { toast } from "sonner";
import {
  Upload,
  FileAudio,
  CheckCircle2,
  Loader2,
  Sparkles,
  ListTodo,
  X,
  AlertCircle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────

interface ExtractedTask {
  title: string;
  description: string;
  assigneeName: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

interface UploadResponse {
  transcript: string;
  voiceTranscriptId: string;
  confidence: number;
}

interface ExtractResponse {
  tasks: ExtractedTask[];
}

// ─── Helpers ─────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getConfidenceLabel(confidence: number): {
  label: string;
  className: string;
} {
  if (confidence >= 0.9)
    return {
      label: "High confidence",
      className:
        "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    };
  if (confidence >= 0.7)
    return {
      label: "Medium confidence",
      className:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    };
  return {
    label: "Low confidence",
    className:
      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  };
}

const PRIORITY_CONFIG: Record<
  ExtractedTask["priority"],
  { label: string; className: string }
> = {
  urgent: {
    label: "Urgent",
    className:
      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
  high: {
    label: "High",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  },
  medium: {
    label: "Medium",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  },
  low: {
    label: "Low",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  },
};

// ─── Sub-components ─────────────────────────────────────

function PriorityBadge({ priority }: { priority: ExtractedTask["priority"] }) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

function UploadSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

function ExtractionSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border p-4 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

export function MeetingsClient() {
  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processing state
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);

  // Result state
  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<
    ExtractedTask[] | null
  >(null);
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<Set<number>>(
    new Set()
  );
  const [error, setError] = useState<string | null>(null);

  // Task creation state
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Pre-select all tasks when extraction completes
  useEffect(() => {
    if (extractedTasks) {
      setSelectedTaskIndices(
        new Set(extractedTasks.map((_, i) => i))
      );
    }
  }, [extractedTasks]);

  // Fetch projects for task creation
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects-for-meetings"],
    queryFn: async () => {
      const res = await apiClient("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const json = await res.json();
      return (json.data as Project[]).filter(
        (p) => p.status === "active"
      );
    },
    enabled: extractedTasks !== null,
  });

  // ── Drag-and-drop ──────────────────────────────────────

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFileSelect(dropped);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleFileSelect = (selected: File) => {
    const MAX_SIZE = 100 * 1024 * 1024; // 100 MB
    if (selected.size > MAX_SIZE) {
      setError("File exceeds the 100 MB limit. Please choose a smaller file.");
      return;
    }
    setFile(selected);
    setError(null);
    // Reset previous results when a new file is chosen
    setTranscript(null);
    setTranscriptId(null);
    setConfidence(null);
    setExtractedTasks(null);
    setSelectedTaskIndices(new Set());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFileSelect(selected);
  };

  const handleClearFile = () => {
    setFile(null);
    setError(null);
    setTranscript(null);
    setTranscriptId(null);
    setConfidence(null);
    setExtractedTasks(null);
    setSelectedTaskIndices(new Set());
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Upload + Transcribe ────────────────────────────────

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("recording", file);

      const res = await apiClient("/api/meetings/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res
          .json()
          .catch(() => ({ error: "Upload failed" }));
        throw new Error(json.error ?? "Failed to upload recording");
      }

      const data = (await res.json()) as UploadResponse;
      setTranscript(data.transcript);
      setTranscriptId(data.voiceTranscriptId);
      setConfidence(data.confidence);
      toast.success("Recording transcribed successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Extract Tasks ──────────────────────────────────────

  const handleExtract = async () => {
    if (!transcript) return;
    setIsExtracting(true);
    setError(null);

    try {
      const res = await apiClient("/api/meetings/extract", {
        method: "POST",
        body: JSON.stringify({
          transcript,
          voiceTranscriptId: transcriptId,
        }),
      });

      if (!res.ok) {
        const json = await res
          .json()
          .catch(() => ({ error: "Extraction failed" }));
        throw new Error(json.error ?? "Failed to extract tasks");
      }

      const data = (await res.json()) as ExtractResponse;
      setExtractedTasks(data.tasks);

      if (data.tasks.length === 0) {
        toast.info("No action items were found in this transcript.");
      } else {
        toast.success(
          `${data.tasks.length} task${data.tasks.length !== 1 ? "s" : ""} extracted`
        );
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Extraction failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setIsExtracting(false);
    }
  };

  // ── Create Tasks ───────────────────────────────────────

  const handleCreateTasks = async () => {
    if (!extractedTasks || !selectedProjectId) return;
    setIsCreatingTasks(true);
    setError(null);

    const tasksToCreate = extractedTasks.filter((_, i) =>
      selectedTaskIndices.has(i)
    );

    let successCount = 0;
    const failures: string[] = [];

    for (const task of tasksToCreate) {
      try {
        const res = await apiClient("/api/tasks", {
          method: "POST",
          body: JSON.stringify({
            title: task.title,
            description: task.description || null,
            priority: task.priority,
            dueDate: task.dueDate || null,
            projectId: selectedProjectId,
          }),
        });

        if (!res.ok) {
          const json = await res
            .json()
            .catch(() => ({ error: "Failed to create task" }));
          failures.push(
            `"${task.title}": ${json.error ?? "unknown error"}`
          );
        } else {
          successCount++;
        }
      } catch {
        failures.push(`"${task.title}": network error`);
      }
    }

    if (successCount > 0) {
      toast.success(
        `${successCount} task${successCount !== 1 ? "s" : ""} created successfully`
      );
    }

    if (failures.length > 0) {
      toast.error(
        `${failures.length} task${failures.length !== 1 ? "s" : ""} failed to create`
      );
    }

    setIsCreatingTasks(false);
  };

  const toggleTaskSelection = (index: number) => {
    setSelectedTaskIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!extractedTasks) return;
    if (selectedTaskIndices.size === extractedTasks.length) {
      setSelectedTaskIndices(new Set());
    } else {
      setSelectedTaskIndices(new Set(extractedTasks.map((_, i) => i)));
    }
  };

  // ── Render ─────────────────────────────────────────────

  const confidenceInfo =
    confidence !== null ? getConfidenceLabel(confidence) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Meeting Recordings" },
        ]}
      />

      {/* Page header */}
      <div className="flex items-center gap-3">
        <FileAudio className="size-6 text-violet-400" aria-hidden="true" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Meeting Recordings
          </h1>
        </div>
      </div>

      {/* Global error banner */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto shrink-0 opacity-70 hover:opacity-100"
            aria-label="Dismiss error"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ── Upload Section ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="size-4" aria-hidden="true" />
            Upload Recording
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {isUploading ? (
            <UploadSkeleton />
          ) : (
            <>
              {/* Drop zone */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Drop zone: drop your recording here or press Enter to browse files"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={[
                  "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
                  file ? "py-6" : "py-10",
                ].join(" ")}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,video/mp4,video/webm,video/quicktime"
                  className="sr-only"
                  aria-hidden="true"
                  onChange={handleInputChange}
                />

                {file ? (
                  /* File selected state */
                  <div className="flex w-full items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileAudio className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearFile();
                      }}
                      aria-label="Remove selected file"
                      className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  /* Empty drop zone */
                  <>
                    <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Upload className="size-6" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Drop your recording here or click to browse
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Audio or video — up to 100 MB
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        MP3, MP4, WAV, WebM, MOV, M4A, and more
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Upload button */}
              {file && !transcript && (
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2
                        className="mr-2 size-4 animate-spin"
                        aria-hidden="true"
                      />
                      Uploading and transcribing&hellip;
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 size-4" aria-hidden="true" />
                      Upload &amp; Transcribe
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Transcript Section ─────────────────────────── */}
      {isUploading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      )}

      {transcript && !isUploading && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Transcript</CardTitle>
              {confidenceInfo && (
                <Badge
                  variant="outline"
                  className={confidenceInfo.className}
                  aria-label={`Transcription confidence: ${confidenceInfo.label} (${Math.round(confidence! * 100)}%)`}
                >
                  {confidenceInfo.label} &mdash;{" "}
                  {Math.round(confidence! * 100)}%
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Scrollable transcript text */}
            <div
              className="max-h-64 overflow-y-auto rounded-lg border bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground"
              tabIndex={0}
              aria-label="Meeting transcript"
            >
              <p className="whitespace-pre-wrap">{transcript}</p>
            </div>

            {/* Extract tasks button */}
            {!extractedTasks && (
              <Button
                onClick={handleExtract}
                disabled={isExtracting}
                variant="outline"
                className="w-full"
              >
                {isExtracting ? (
                  <>
                    <Loader2
                      className="mr-2 size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Extracting action items&hellip;
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" aria-hidden="true" />
                    Extract Tasks
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Extracted Tasks Section ────────────────────── */}
      {isExtracting && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extracted Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <ExtractionSkeleton />
          </CardContent>
        </Card>
      )}

      {extractedTasks && !isExtracting && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListTodo className="size-4" aria-hidden="true" />
                Extracted Tasks ({extractedTasks.length})
              </CardTitle>

              {extractedTasks.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {selectedTaskIndices.size === extractedTasks.length
                    ? "Deselect all"
                    : "Select all"}
                </button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {extractedTasks.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No action items were identified in this transcript.
              </p>
            ) : (
              <>
                {/* Task list */}
                <ul className="space-y-2" aria-label="Extracted tasks">
                  {extractedTasks.map((task, index) => {
                    const isSelected = selectedTaskIndices.has(index);
                    return (
                      <li key={index}>
                        <label
                          className={[
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                            isSelected
                              ? "border-primary/40 bg-primary/5"
                              : "border-border bg-card hover:bg-accent/30",
                          ].join(" ")}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTaskSelection(index)}
                            aria-label={`Select task: ${task.title}`}
                            className="mt-0.5 size-4 shrink-0 accent-primary"
                          />

                          {/* Task content */}
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <p className="text-sm font-medium leading-snug">
                              {task.title}
                            </p>

                            {task.description && (
                              <p className="line-clamp-2 text-xs text-muted-foreground">
                                {task.description}
                              </p>
                            )}

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <PriorityBadge priority={task.priority} />

                              {task.assigneeName && (
                                <span className="text-xs text-muted-foreground">
                                  Assignee: {task.assigneeName}
                                </span>
                              )}

                              {task.dueDate && (
                                <span className="text-xs text-muted-foreground">
                                  Due:{" "}
                                  {new Date(task.dueDate).toLocaleDateString(
                                    undefined,
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    }
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Selected indicator */}
                          {isSelected && (
                            <CheckCircle2
                              className="mt-0.5 size-4 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>

                {/* Project selector + create button */}
                <div className="space-y-3 border-t pt-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="meetings-project-select"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Add tasks to project
                    </label>
                    <Select
                      value={selectedProjectId}
                      onValueChange={setSelectedProjectId}
                      disabled={isCreatingTasks}
                    >
                      <SelectTrigger
                        id="meetings-project-select"
                        className="w-full"
                        aria-label="Select a project"
                      >
                        <SelectValue placeholder="Select a project..." />
                      </SelectTrigger>
                      <SelectContent>
                        {!projects || projects.length === 0 ? (
                          <SelectItem value="__none__" disabled>
                            No active projects found
                          </SelectItem>
                        ) : (
                          projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleCreateTasks}
                    disabled={
                      isCreatingTasks ||
                      selectedTaskIndices.size === 0 ||
                      !selectedProjectId
                    }
                    className="w-full"
                  >
                    {isCreatingTasks ? (
                      <>
                        <Loader2
                          className="mr-2 size-4 animate-spin"
                          aria-hidden="true"
                        />
                        Creating tasks&hellip;
                      </>
                    ) : (
                      <>
                        <CheckCircle2
                          className="mr-2 size-4"
                          aria-hidden="true"
                        />
                        Create{" "}
                        {selectedTaskIndices.size > 0
                          ? selectedTaskIndices.size
                          : ""}{" "}
                        Task{selectedTaskIndices.size !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>

                  {selectedTaskIndices.size === 0 && (
                    <p className="text-center text-xs text-muted-foreground">
                      Select at least one task to create
                    </p>
                  )}

                  {selectedTaskIndices.size > 0 && !selectedProjectId && (
                    <p className="text-center text-xs text-muted-foreground">
                      Choose a project to add the tasks to
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
