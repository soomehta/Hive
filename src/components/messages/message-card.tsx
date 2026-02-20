"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pin } from "lucide-react";
import { relativeDate } from "@/lib/utils/dates";
import type { Message } from "@/types";

interface MessageCardProps {
  message: Message;
  onClick?: () => void;
}

export function MessageCard({ message, onClick }: MessageCardProps) {
  return (
    <Card
      className="hover:border-primary/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            {message.title && (
              <h4 className="text-sm font-medium">{message.title}</h4>
            )}
            <p className="text-muted-foreground text-xs">
              {relativeDate(message.createdAt)}
            </p>
          </div>
          {message.isPinned && (
            <Pin className="text-primary h-4 w-4" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm line-clamp-3">
          {message.content}
        </p>
      </CardContent>
    </Card>
  );
}
