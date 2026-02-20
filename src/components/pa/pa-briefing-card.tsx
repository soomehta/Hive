"use client";

import { Sun, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePABriefing } from "@/hooks/use-pa";

export function PABriefingCard() {
  const { data, isLoading, error } = usePABriefing();

  if (isLoading) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <div className="size-2 animate-pulse rounded-full bg-violet-400" />
            Loading briefing...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) return null;

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sun className="size-5 text-amber-400" />
          Morning Briefing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-zinc-300">{data.briefing}</p>

        <div className="flex flex-wrap gap-2">
          {data.todaysTasks.length > 0 && (
            <Badge variant="outline" className="gap-1 border-zinc-700 text-zinc-400">
              <Clock className="size-3" />
              {data.todaysTasks.length} due today
            </Badge>
          )}
          {data.overdueTasks.length > 0 && (
            <Badge variant="outline" className="gap-1 border-red-500/30 text-red-400">
              <AlertTriangle className="size-3" />
              {data.overdueTasks.length} overdue
            </Badge>
          )}
          {data.blockers.length > 0 && (
            <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-400">
              <AlertTriangle className="size-3" />
              {data.blockers.length} blocked
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 border-zinc-700 text-zinc-400">
            <CheckCircle2 className="size-3" />
            {data.totalActiveTasks} active
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
