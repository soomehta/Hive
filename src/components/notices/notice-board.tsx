"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pin, Archive, Filter } from "lucide-react";

export type Notice = {
  id: string;
  title: string;
  body: string;
  status: "active" | "scheduled" | "expired" | "archived";
  isPinned: boolean;
  projectId: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type StatusFilter = "all" | "active" | "scheduled" | "expired" | "archived";

interface NoticeBoardProps {
  notices: Notice[];
  isLoading: boolean;
  onTogglePin: (noticeId: string) => void;
  onArchive: (noticeId: string) => void;
}

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: "All Active", value: "all" },
  { label: "Active", value: "active" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Expired", value: "expired" },
  { label: "Archived", value: "archived" },
];

export function NoticeBoard({ notices, isLoading, onTogglePin, onArchive }: NoticeBoardProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredNotices = useMemo(
    () =>
      statusFilter === "all"
        ? notices.filter((n) => n.status !== "archived")
        : notices.filter((n) => n.status === statusFilter),
    [notices, statusFilter],
  );

  return (
    <>
      {/* ─── Status filter tabs ─── */}
      <div className="flex items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={statusFilter === tab.value ? "secondary" : "ghost"}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
            {tab.value !== "all" && (
              <Badge variant="outline" className="ml-1 text-[10px]">
                {notices.filter((n) => n.status === tab.value).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* ─── Notice list ─── */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : filteredNotices.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground text-center">
            No {statusFilter === "all" ? "active" : statusFilter} notices.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotices.map((notice) => (
            <Card key={notice.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{notice.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {new Date(notice.createdAt).toLocaleString()}
                      </p>
                      {notice.startsAt && (
                        <span className="text-xs text-muted-foreground">
                          · starts {new Date(notice.startsAt).toLocaleDateString()}
                        </span>
                      )}
                      {notice.expiresAt && (
                        <span className="text-xs text-muted-foreground">
                          · expires {new Date(notice.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={notice.isPinned ? "default" : "outline"}>
                      {notice.isPinned ? "Pinned" : notice.status}
                    </Badge>
                    {notice.status !== "archived" && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onTogglePin(notice.id)}
                          title={notice.isPinned ? "Unpin" : "Pin"}
                        >
                          <Pin className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onArchive(notice.id)}
                          title="Archive notice"
                        >
                          <Archive className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{notice.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
