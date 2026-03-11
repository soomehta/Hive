"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, X } from "lucide-react";

export interface Backlink {
  id: string;
  fromItemId: string;
  relationType: string;
  fromItemTitle?: string | null;
  fromItemType?: string | null;
}

interface BacklinksPanelProps {
  backlinks: Backlink[];
  onClose: () => void;
}

const ITEM_TYPE_ROUTES: Record<string, string> = {
  page: "/dashboard/pages",
  task: "/dashboard/my-tasks",
  project: "/dashboard/projects",
};

export function BacklinksPanel({ backlinks, onClose }: BacklinksPanelProps) {
  return (
    <Card className="w-72 shrink-0">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm flex items-center gap-1">
          <Link2 className="size-4" />
          Backlinks
        </CardTitle>
        <Button size="icon" variant="ghost" className="size-6" onClick={onClose}>
          <X className="size-3" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
        {backlinks.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No items link to this page yet.
          </p>
        ) : (
          backlinks.map((bl) => {
            const baseRoute = ITEM_TYPE_ROUTES[bl.fromItemType ?? "page"] ?? "/dashboard/pages";
            return (
              <Link
                key={bl.id}
                href={`${baseRoute}/${bl.fromItemId}`}
                className="block rounded-md border bg-background p-2 hover:bg-accent/50 transition-colors"
              >
                <p className="text-xs font-medium truncate">
                  {bl.fromItemTitle || bl.fromItemId}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {bl.relationType.replace("_", " ")}
                  </Badge>
                  {bl.fromItemType && (
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {bl.fromItemType}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
