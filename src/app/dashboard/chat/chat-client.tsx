"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrg } from "@/hooks/use-org";
import { apiClient } from "@/lib/utils/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, UserMinus, X } from "lucide-react";
import { toast } from "sonner";
import { MemberPicker } from "@/components/shared/member-picker";
import { ChannelList, type Channel } from "@/components/chat/channel-list";
import { ChannelView, type Message } from "@/components/chat/channel-view";
import { ThreadPanel, type ThreadMessage } from "@/components/chat/thread-panel";

type ChannelMember = {
  id: string;
  userId: string;
  displayName?: string;
  role: "owner" | "moderator" | "member";
  createdAt: string;
};

interface ChatClientProps {
  initialChannelId?: string;
}

export function ChatClient({ initialChannelId }: ChatClientProps = {}) {
  const queryClient = useQueryClient();
  const { orgId } = useOrg();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(initialChannelId ?? null);

  // Thread state
  const [activeThreadMessageId, setActiveThreadMessageId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Members panel state
  const [showMembers, setShowMembers] = useState(false);

  // Pagination state
  const [beforeCursor, setBeforeCursor] = useState<string | undefined>(undefined);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // Search state
  const [searchResults, setSearchResults] = useState<Message[] | undefined>(undefined);
  const [isSearching, setIsSearching] = useState(false);

  // ─── Channels ─────────────────────────────────────────
  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ["chat-channels", orgId],
    queryFn: async () => {
      const res = await apiClient("/api/chat/channels");
      if (!res.ok) throw new Error("Failed to load channels");
      const json = (await res.json()) as { data: Channel[] };
      return json.data;
    },
    enabled: !!orgId,
  });

  useEffect(() => {
    if (!selectedChannelId && channels.length > 0) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  );

  // ─── Messages (reactions + thread counts now come from API) ───
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["chat-messages", orgId, selectedChannelId, beforeCursor],
    queryFn: async () => {
      const url = beforeCursor
        ? `/api/chat/channels/${selectedChannelId}/messages?before=${beforeCursor}&limit=50`
        : `/api/chat/channels/${selectedChannelId}/messages?limit=50`;
      const res = await apiClient(url);
      if (!res.ok) throw new Error("Failed to load messages");
      const json = (await res.json()) as { data: Message[] };
      // If the API returned fewer than 50, there are no more earlier messages
      if (json.data.length < 50) setHasMoreMessages(false);
      else setHasMoreMessages(true);
      return json.data;
    },
    enabled: !!orgId && !!selectedChannelId,
    refetchInterval: 15_000,
  });

  // Item 8: Reactions now come batch-fetched from the messages API — no separate N+1 query needed.

  const visibleMessages = useMemo(
    () =>
      messages
        .filter((m) => !m.deletedAt)
        .slice()
        .reverse(),
    [messages]
  );

  // ─── Load earlier messages ──────────────────────────────
  const handleLoadEarlier = useCallback(() => {
    const oldest = messages[messages.length - 1];
    if (oldest) setBeforeCursor(oldest.id);
  }, [messages]);

  // ─── Members ──────────────────────────────────────────
  const { data: members = [] } = useQuery({
    queryKey: ["chat-members", orgId, selectedChannelId],
    queryFn: async () => {
      const res = await apiClient(`/api/chat/channels/${selectedChannelId}/members`);
      if (!res.ok) throw new Error("Failed to load members");
      const json = (await res.json()) as { data: ChannelMember[] };
      return json.data;
    },
    enabled: !!orgId && !!selectedChannelId && showMembers,
  });

  // ─── Thread Messages ─────────────────────────────────
  const { data: threadMessages = [] } = useQuery({
    queryKey: ["thread-messages", orgId, activeThreadId],
    queryFn: async () => {
      const res = await apiClient(`/api/chat/threads/${activeThreadId}/messages`);
      if (!res.ok) throw new Error("Failed to load thread");
      const json = (await res.json()) as { data: ThreadMessage[] };
      return json.data;
    },
    enabled: !!orgId && !!activeThreadId,
    refetchInterval: 10_000,
  });

  // ─── Unread Counts ──────────────────────────────────────────
  const { data: unreadCounts = {} } = useQuery({
    queryKey: ["chat-unread", orgId],
    queryFn: async () => {
      const res = await apiClient("/api/chat/unread");
      if (!res.ok) throw new Error("Failed to load unread counts");
      const json = (await res.json()) as { data: Record<string, number> };
      return json.data;
    },
    enabled: !!orgId,
    refetchInterval: 30_000,
  });

  // ─── Mark Channel as Read ──────────────────────────────
  useEffect(() => {
    if (!selectedChannelId || !orgId) return;
    apiClient(`/api/chat/channels/${selectedChannelId}/read`, { method: "POST" })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["chat-unread", orgId] });
      })
      .catch(() => {});
  }, [selectedChannelId, orgId, queryClient]);

  // ─── Mutations ────────────────────────────────────────
  const createChannel = useMutation({
    mutationFn: async ({ name, topic }: { name: string; topic: string }) => {
      const res = await apiClient("/api/chat/channels", {
        method: "POST",
        body: JSON.stringify({
          scope: "team",
          name,
          topic: topic || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to create channel");
      }
      return (await res.json()) as { data: Channel };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["chat-channels", orgId] });
      setSelectedChannelId(result.data.id);
      toast.success("Channel created");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Item 5: Optimistic message sending
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedChannelId) return null;
      const res = await apiClient(`/api/chat/channels/${selectedChannelId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to send message");
      }
      return res.json();
    },
    onMutate: async (content) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["chat-messages", orgId, selectedChannelId],
      });

      const previousMessages = queryClient.getQueryData<Message[]>([
        "chat-messages", orgId, selectedChannelId, beforeCursor,
      ]);

      // Optimistically insert the new message at the beginning (API returns desc order)
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        content,
        authorId: "me",
        authorName: "You",
        isPending: true,
        editedAt: null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        reactions: [],
      };

      queryClient.setQueryData<Message[]>(
        ["chat-messages", orgId, selectedChannelId, beforeCursor],
        (old = []) => [tempMessage, ...old]
      );

      return { previousMessages };
    },
    onError: (error: Error, _content, context) => {
      // Roll back optimistic update
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["chat-messages", orgId, selectedChannelId, beforeCursor],
          context.previousMessages
        );
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["chat-messages", orgId, selectedChannelId],
      });
    },
  });

  const editMessage = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const res = await apiClient(`/api/chat/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to edit message");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", orgId, selectedChannelId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await apiClient(`/api/chat/messages/${messageId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete message");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", orgId, selectedChannelId] });
      toast.success("Message deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const convertToTask = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await apiClient(`/api/chat/messages/${messageId}/convert-task`, {
        method: "POST",
        body: JSON.stringify({ projectId: selectedChannel?.projectId || undefined }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to convert to task");
      }
      return res.json();
    },
    onSuccess: () => toast.success("Message converted to task"),
    onError: (error: Error) => toast.error(error.message),
  });

  const convertToPage = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await apiClient(`/api/chat/messages/${messageId}/convert-page`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to convert to page");
      }
      return res.json();
    },
    onSuccess: () => toast.success("Message converted to page"),
    onError: (error: Error) => toast.error(error.message),
  });

  const pinMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await apiClient(`/api/chat/messages/${messageId}/pin`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to toggle pin");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", orgId, selectedChannelId] });
      toast.success("Pin toggled");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const res = await apiClient(`/api/chat/messages/${messageId}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) throw new Error("Failed to toggle reaction");
      return res.json();
    },
    onSuccess: () => {
      // Reactions now come with messages, so invalidate messages
      queryClient.invalidateQueries({ queryKey: ["chat-messages", orgId, selectedChannelId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openThread = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await apiClient(`/api/chat/messages/${messageId}/thread`, {
        method: "POST",
        body: JSON.stringify({ channelId: selectedChannelId }),
      });
      if (!res.ok) throw new Error("Failed to open thread");
      return (await res.json()) as { data: { id: string } };
    },
    onSuccess: (result, messageId) => {
      setActiveThreadMessageId(messageId);
      setActiveThreadId(result.data.id);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sendThreadReply = useMutation({
    mutationFn: async (content: string) => {
      if (!activeThreadId) return null;
      const res = await apiClient(`/api/chat/threads/${activeThreadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send reply");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread-messages", orgId, activeThreadId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateTopic = useMutation({
    mutationFn: async (topic: string) => {
      const res = await apiClient(`/api/chat/channels/${selectedChannelId}`, {
        method: "PATCH",
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update topic");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-channels", orgId] });
      toast.success("Topic updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient(`/api/chat/channels/${selectedChannelId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to add member");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-members", orgId, selectedChannelId] });
      toast.success("Member added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient(
        `/api/chat/channels/${selectedChannelId}/members/${userId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to remove member");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-members", orgId, selectedChannelId] });
      toast.success("Member removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Item 14: Leave channel
  const leaveChannel = useMutation({
    mutationFn: async () => {
      const res = await apiClient(
        `/api/chat/channels/${selectedChannelId}/members/me`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to leave channel");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-channels", orgId] });
      // Select next available channel
      const remaining = channels.filter((c) => c.id !== selectedChannelId);
      setSelectedChannelId(remaining[0]?.id ?? null);
      setShowMembers(false);
      toast.success("Left channel");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Item 15: Search messages
  const handleSearchMessages = useCallback(
    async (query: string) => {
      if (!selectedChannelId) return;
      setIsSearching(true);
      try {
        const res = await apiClient(
          `/api/search/messages?channelId=${selectedChannelId}&q=${encodeURIComponent(query)}`
        );
        if (!res.ok) throw new Error("Search failed");
        const json = (await res.json()) as { data: Message[] };
        setSearchResults(json.data);
      } catch {
        toast.error("Search failed");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [selectedChannelId]
  );

  // ─── Helpers ──────────────────────────────────────────
  function closeThread() {
    setActiveThreadMessageId(null);
    setActiveThreadId(null);
  }

  function handleSelectChannel(channelId: string) {
    setSelectedChannelId(channelId);
    setBeforeCursor(undefined);
    setHasMoreMessages(true);
    closeThread();
    setShowMembers(false);
    setSearchResults(undefined);
  }

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Chat</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <ChannelList
          channels={channels}
          isLoading={channelsLoading}
          selectedChannelId={selectedChannelId}
          onSelectChannel={handleSelectChannel}
          onCreateChannel={(name, topic) => createChannel.mutate({ name, topic })}
          isCreating={createChannel.isPending}
          unreadCounts={unreadCounts}
        />

        <div className="flex gap-4">
          <ChannelView
            channel={selectedChannel}
            messages={visibleMessages}
            isLoading={messagesLoading}
            showMembers={showMembers}
            onToggleMembers={() => setShowMembers(!showMembers)}
            onSendMessage={(content) => sendMessage.mutate(content)}
            isSending={sendMessage.isPending}
            onEditMessage={(messageId, content) => editMessage.mutate({ messageId, content })}
            isEditing={editMessage.isPending}
            onDeleteMessage={(messageId) => deleteMessage.mutate(messageId)}
            onConvertToTask={(messageId) => convertToTask.mutate(messageId)}
            onConvertToPage={(messageId) => convertToPage.mutate(messageId)}
            onOpenThread={(messageId) => openThread.mutate(messageId)}
            onUpdateTopic={(topic) => updateTopic.mutate(topic)}
            onPinMessage={(messageId) => pinMessage.mutate(messageId)}
            onToggleReaction={(messageId, emoji) => toggleReaction.mutate({ messageId, emoji })}
            onLoadEarlier={handleLoadEarlier}
            hasMore={hasMoreMessages}
            onSearchMessages={handleSearchMessages}
            searchResults={searchResults}
            isSearching={isSearching}
          />

          {activeThreadId && (
            <ThreadPanel
              rootMessageContent={visibleMessages.find((m) => m.id === activeThreadMessageId)?.content}
              threadMessages={threadMessages}
              onSendReply={(content) => sendThreadReply.mutate(content)}
              isSending={sendThreadReply.isPending}
              onClose={closeThread}
            />
          )}

          {showMembers && selectedChannelId && (
            <Card className="w-64 shrink-0">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm">Members</CardTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  onClick={() => setShowMembers(false)}
                >
                  <X className="size-3" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <MemberPicker
                  onSelect={(userId) => addMember.mutate(userId)}
                  excludeUserIds={members.map((m) => m.userId)}
                  placeholder="Add member..."
                />

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-md border bg-background p-2"
                    >
                      <div>
                        {/* Item 6: Show display name instead of raw user ID */}
                        <p className="text-sm font-medium truncate max-w-[120px]">
                          {member.displayName ?? member.userId.slice(0, 8)}
                        </p>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {member.role}
                        </Badge>
                      </div>
                      {member.role !== "owner" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6"
                          title="Remove member"
                          onClick={() => removeMember.mutate(member.userId)}
                        >
                          <UserMinus className="size-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Item 14: Leave channel button */}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => leaveChannel.mutate()}
                  disabled={leaveChannel.isPending}
                >
                  <LogOut className="size-3 mr-1" />
                  Leave Channel
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
