import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProjectNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <h2 className="text-xl font-semibold">Project not found</h2>
      <p className="text-muted-foreground max-w-md">
        This project does not exist or you do not have access to it.
      </p>
      <Button asChild>
        <Link href="/dashboard/projects">Back to Projects</Link>
      </Button>
    </div>
  );
}
