import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <h2 className="text-xl font-semibold">Page not found</h2>
      <p className="text-muted-foreground max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button asChild>
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
