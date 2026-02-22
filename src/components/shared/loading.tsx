import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function Loading({ className, size = "default" }: LoadingProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("flex items-center justify-center", className)}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-muted-foreground/25 border-t-foreground",
          size === "sm" && "size-4",
          size === "default" && "size-6",
          size === "lg" && "size-8"
        )}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
