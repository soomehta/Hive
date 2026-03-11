"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

export type Channel = {
  id: string;
  name: string;
  scope: "team" | "project" | "workspace" | "agent";
  topic: string | null;
  description?: string | null;
  projectId: string | null;
  isArchived?: boolean;
};

interface ChannelListProps {
  channels: Channel[];
  isLoading: boolean;
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onCreateChannel: (name: string, topic: string) => void;
  isCreating: boolean;
  unreadCounts?: Record<string, number>;
}

const SCOPE_ORDER: Channel["scope"][] = ["workspace", "project", "team", "agent"];
const SCOPE_LABELS: Record<string, string> = {
  workspace: "Workspace",
  project: "Project",
  team: "Team",
  agent: "Agent",
};

export function ChannelList({
  channels,
  isLoading,
  selectedChannelId,
  onSelectChannel,
  onCreateChannel,
  isCreating,
  unreadCounts = {},
}: ChannelListProps) {
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelTopic, setNewChannelTopic] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [collapsedScopes, setCollapsedScopes] = useState<Set<string>>(new Set());

  const handleCreate = () => {
    onCreateChannel(newChannelName.trim(), newChannelTopic.trim());
    setNewChannelName("");
    setNewChannelTopic("");
    setShowCreateForm(false);
  };

  const toggleScope = (scope: string) => {
    setCollapsedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  };

  // Filter out archived channels
  const activeChannels = channels.filter((c) => !c.isArchived);

  // Group by scope, preserving SCOPE_ORDER
  const grouped = SCOPE_ORDER.reduce<Record<string, Channel[]>>((acc, scope) => {
    const items = activeChannels.filter((c) => c.scope === scope);
    if (items.length > 0) acc[scope] = items;
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Channels</CardTitle>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => setShowCreateForm(!showCreateForm)}
          title="Create channel"
        >
          <Plus className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {showCreateForm && (
          <div className="space-y-2 rounded-md border p-2">
            <Input
              placeholder="New channel name"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
            />
            <Input
              placeholder="Topic (optional)"
              value={newChannelTopic}
              onChange={(e) => setNewChannelTopic(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={!newChannelName.trim() || isCreating}
                onClick={handleCreate}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : activeChannels.length === 0 ? (
          <p className="text-sm text-muted-foreground">No channels yet.</p>
        ) : (
          <div className="space-y-1">
            {Object.entries(grouped).map(([scope, scopeChannels]) => (
              <div key={scope}>
                <button
                  className="flex w-full items-center gap-1 py-1 text-xs font-semibold uppercase text-muted-foreground hover:text-foreground"
                  onClick={() => toggleScope(scope)}
                >
                  {collapsedScopes.has(scope) ? (
                    <ChevronRight className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                  {SCOPE_LABELS[scope] ?? scope}
                </button>
                {!collapsedScopes.has(scope) &&
                  scopeChannels.map((channel) => {
                    const unread = unreadCounts[channel.id] ?? 0;
                    return (
                      <button
                        key={channel.id}
                        onClick={() => onSelectChannel(channel.id)}
                        className={`w-full rounded-md px-3 py-2 text-left ${
                          selectedChannelId === channel.id
                            ? "border border-primary bg-primary/5"
                            : "hover:bg-muted/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className={`text-sm ${unread > 0 ? "font-bold" : "font-medium"}`}>
                            #{channel.name}
                          </p>
                          {unread > 0 && (
                            <Badge
                              variant="default"
                              className="ml-2 h-5 min-w-5 px-1.5 text-[10px]"
                            >
                              {unread > 99 ? "99+" : unread}
                            </Badge>
                          )}
                        </div>
                        {channel.topic && (
                          <p className="truncate text-xs text-muted-foreground" title={channel.topic}>
                            {channel.topic}
                          </p>
                        )}
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
