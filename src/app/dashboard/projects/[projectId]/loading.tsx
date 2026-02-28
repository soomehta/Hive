import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectLoading() {
  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Skeleton className="h-5 w-64" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Tabs */}
      <Skeleton className="h-10 w-full max-w-sm" />

      {/* Content area */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
