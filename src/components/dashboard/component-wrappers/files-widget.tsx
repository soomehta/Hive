"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/utils/api-client";
import { createClient } from "@/lib/supabase/client";
import { relativeDate } from "@/lib/utils/dates";
import { getUserDisplayName } from "@/lib/utils/user-display";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Paperclip,
  Upload,
  Download,
  Trash2,
  FileText,
  Image,
  FileArchive,
  File as FileIcon,
} from "lucide-react";
import type { WidgetProps } from "@/types/bees";
import type { FileRecord } from "@/types";
import { toast } from "sonner";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("zip") || mimeType.includes("archive") || mimeType.includes("tar") || mimeType.includes("gzip")) return FileArchive;
  if (mimeType.includes("pdf") || mimeType.includes("text") || mimeType.includes("document")) return FileText;
  return FileIcon;
}

export function FilesWidget({ orgId, projectId, isEditing }: WidgetProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    }
    fetchUser();
  }, []);

  const { data: files, isLoading } = useQuery({
    queryKey: ["project-files", projectId, orgId],
    queryFn: async () => {
      const res = await apiClient(`/api/projects/${projectId}/files`);
      if (!res.ok) throw new Error("Failed to fetch files");
      const json = await res.json();
      return json.data as FileRecord[];
    },
    enabled: !!orgId && !!projectId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiClient(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to upload file");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("File uploaded");
      queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload file");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await apiClient(`/api/projects/${projectId}/files/${fileId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete file");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("File deleted");
      queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
      setDeleteFileId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete file");
    },
  });

  async function handleDownload(fileId: string, fileName: string) {
    try {
      const res = await apiClient(`/api/projects/${projectId}/files/${fileId}`);
      if (!res.ok) throw new Error("Failed to get download URL");
      const json = await res.json();
      const downloadUrl = json.data.downloadUrl;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error("Failed to download file");
    }
  }

  async function uploadMultipleFiles(files: FileList | File[]) {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    if (fileArr.length === 1) {
      uploadMutation.mutate(fileArr[0]);
      return;
    }

    const results = await Promise.allSettled(
      fileArr.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await apiClient(`/api/projects/${projectId}/files`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Upload failed");
        return res.json();
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - succeeded;

    if (failed === 0) {
      toast.success(`${succeeded} file${succeeded > 1 ? "s" : ""} uploaded`);
    } else {
      toast.warning(`${succeeded} uploaded, ${failed} failed`);
    }
    queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadMultipleFiles(files);
    }
    // Reset input so the same file can be selected again
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadMultipleFiles(files);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if leaving the container (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }

  if (!projectId) {
    return (
      <div className={`flex h-full flex-col items-center justify-center gap-3 p-6 text-center ${isEditing ? "pointer-events-none select-none" : ""}`}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Paperclip className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Select a project to view files</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`flex h-full flex-col relative ${isEditing ? "pointer-events-none select-none" : ""}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-500 bg-blue-50/80 dark:bg-blue-950/50">
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-blue-500" />
            <p className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">
              Drop files here
            </p>
          </div>
        </div>
      )}

      {/* Header with upload button */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Files {files && files.length > 0 && `(${files.length})`}
          </span>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            {uploadMutation.isPending ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {!files || files.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center h-full">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Paperclip className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No files yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload files to share with your team
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload File
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {files.map((file) => {
              const Icon = getFileIcon(file.mimeType);
              const isOwner = currentUserId === file.uploadedBy;

              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors group"
                >
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.fileSize)} &middot;{" "}
                      {getUserDisplayName({ userId: file.uploadedBy })} &middot;{" "}
                      {relativeDate(file.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDownload(file.id, file.fileName)}
                      aria-label={`Download ${file.fileName}`}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeleteFileId(file.id)}
                        className="text-destructive hover:text-destructive"
                        aria-label={`Delete ${file.fileName}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteFileId} onOpenChange={(open) => !open && setDeleteFileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this file. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFileId && deleteMutation.mutate(deleteFileId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
