import { Skeleton } from "@/components/ui/skeleton";

export default function MyTasksLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-[140px]" />
        <Skeleton className="h-9 w-[140px]" />
      </div>

      {/* Task groups */}
      {Array.from({ length: 3 }).map((_, group) => (
        <div key={group} className="space-y-2">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
