import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Settings sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      ))}
    </div>
  );
}
