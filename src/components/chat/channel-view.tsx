"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MessageSquare,
  Pencil,
  Trash2,
  Reply,
  ListTodo,
  FileText,
  Users,
  Check,
  Pin,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import type { Channel } from "./channel-list";
import { AgentMessage } from "@/components/chat/agent-message";
import { getUserInitials } from "@/lib/utils/user-display";
import { formatRelativeTime } from "@/lib/utils/time";
import {
  MentionAutocomplete,
  type MentionSuggestion,
} from "@/components/chat/mention-autocomplete";

const COMMON_EMOJIS = ["👍", "❤️", "😂", "🎉", "🤔", "👀", "🔥", "✅"];

export type Message = {
  id: string;
  content: string;
  authorId: string;
  authorName?: string;
  isAgentMessage?: boolean;
  agentMetadata?: Record<string, unknown>;
  isPinned?: boolean;
  isPending?: boolean;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  reactions?: Array<{ emoji: string; count: number; hasReacted: boolean }>;
  threadReplyCount?: number;
};

interface ChannelViewProps {
  channel: Channel | null;
  messages: Message[];
  isLoading: boolean;
  showMembers: boolean;
  onToggleMembers: () => void;
  onSendMessage: (content: string) => void;
  isSending: boolean;
  onEditMessage: (messageId: string, content: string) => void;
  isEditing: boolean;
  onDeleteMessage: (messageId: string) => void;
  onConvertToTask: (messageId: string) => void;
  onConvertToPage: (messageId: string) => void;
  onOpenThread: (messageId: string) => void;
  onUpdateTopic?: (topic: string) => void;
  onPinMessage?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onLoadEarlier?: () => void;
  hasMore?: boolean;
  onSearchMessages?: (query: string) => void;
  searchResults?: Message[];
  isSearching?: boolean;
}

/** Check if two messages should be grouped (same author, within 5 minutes) */
function shouldGroup(prev: Message | undefined, curr: Message): boolean {
  if (!prev) return false;
  if (prev.authorId !== curr.authorId) return false;
  if (prev.isAgentMessage || curr.isAgentMessage) return false;
  const gap = Math.abs(
    new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime()
  );
  return gap < 5 * 60 * 1000;
}

export function ChannelView({
  channel,
  messages,
  isLoading,
  showMembers,
  onToggleMembers,
  onSendMessage,
  isSending,
  onEditMessage,
  isEditing,
  onDeleteMessage,
  onConvertToTask,
  onConvertToPage,
  onOpenThread,
  onUpdateTopic,
  onPinMessage,
  onToggleReaction,
  onLoadEarlier,
  hasMore,
  onSearchMessages,
  searchResults,
  isSearching,
}: ChannelViewProps) {
  const [messageText, setMessageText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editingTopic, setEditingTopic] = useState(false);
  const [topicText, setTopicText] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showPinnedPanel, setShowPinnedPanel] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // ─── Auto-scroll on new messages ───
  useEffect(() => {
    if (isNearBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    isNearBottomRef.current = distanceFromBottom < 200;
    setShowScrollButton(distanceFromBottom > 200);
  }, []);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // ─── Pinned messages ───
  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.isPinned),
    [messages]
  );

  function startEdit(msg: Message) {
    setEditingMessageId(msg.id);
    setEditText(msg.content);
  }

  function handleMessageInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setMessageText(value);

    // Detect @ mention
    const cursorPos = e.target.selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
      const rect = e.target.getBoundingClientRect();
      setMentionPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    } else {
      setMentionQuery(null);
    }
  }

  function handleMentionSelect(mention: MentionSuggestion) {
    const cursorPos = textareaRef.current?.selectionStart ?? messageText.length;
    const textBeforeCursor = messageText.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    if (atIndex === -1) return;

    const before = messageText.slice(0, atIndex);
    const after = messageText.slice(cursorPos);
    const mentionText = `@${mention.name} `;
    setMessageText(before + mentionText + after);
    setMentionQuery(null);
  }

  function handleSearchSubmit() {
    if (searchQuery.trim() && onSearchMessages) {
      onSearchMessages(searchQuery.trim());
    }
  }

  return (
    <Card className="flex-1">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="size-4 shrink-0" />
            {channel ? `#${channel.name}` : "Select a channel"}
            {channel && (
              <Badge variant="outline" className="ml-1 capitalize">
                {channel.scope}
              </Badge>
            )}
          </CardTitle>
          {/* Item 12: Channel description */}
          {channel?.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {channel.description}
            </p>
          )}
        </div>
        {channel && (
          <div className="flex gap-1">
            {onSearchMessages && (
              <Button
                size="sm"
                variant={showSearchPanel ? "secondary" : "outline"}
                onClick={() => {
                  setShowSearchPanel(!showSearchPanel);
                  setShowPinnedPanel(false);
                }}
              >
                <Search className="size-4 mr-1" />
                Search
              </Button>
            )}
            <Button
              size="sm"
              variant={showPinnedPanel ? "secondary" : "outline"}
              onClick={() => {
                setShowPinnedPanel(!showPinnedPanel);
                setShowSearchPanel(false);
              }}
            >
              <Pin className="size-4 mr-1" />
              Pinned
              {pinnedMessages.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1">
                  {pinnedMessages.length}
                </Badge>
              )}
            </Button>
            <Button
              size="sm"
              variant={showMembers ? "secondary" : "outline"}
              onClick={onToggleMembers}
            >
              <Users className="size-4 mr-1" />
              Members
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!channel ? (
          /* Item 11: Better empty state — no channel selected */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="size-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">Select a channel to start chatting</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pick a channel from the list or create a new one
            </p>
          </div>
        ) : (
          <>
            {/* ─── Topic display/edit ─── */}
            <div className="flex items-center gap-2 text-sm">
              {editingTopic ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    className="flex-1 rounded-md border px-2 py-1 text-sm bg-background"
                    value={topicText}
                    onChange={(e) => setTopicText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onUpdateTopic?.(topicText);
                        setEditingTopic(false);
                      }
                      if (e.key === "Escape") setEditingTopic(false);
                    }}
                    autoFocus
                    placeholder="Set a topic..."
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    onClick={() => {
                      onUpdateTopic?.(topicText);
                      setEditingTopic(false);
                    }}
                  >
                    <Check className="size-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-muted-foreground">
                    {channel.topic || "No topic set"}
                  </span>
                  {onUpdateTopic && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6"
                      onClick={() => {
                        setTopicText(channel.topic || "");
                        setEditingTopic(true);
                      }}
                    >
                      <Pencil className="size-3" />
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* ─── Search panel ─── */}
            {showSearchPanel && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-md border px-2 py-1 text-sm bg-background"
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearchSubmit();
                      if (e.key === "Escape") setShowSearchPanel(false);
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSearchSubmit} disabled={!searchQuery.trim()}>
                    Search
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowSearchPanel(false)}>
                    <X className="size-3" />
                  </Button>
                </div>
                {isSearching && <p className="text-xs text-muted-foreground">Searching...</p>}
                {searchResults && searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground">No results found.</p>
                )}
                {searchResults && searchResults.length > 0 && (
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {searchResults.map((r) => (
                      <div key={r.id} className="rounded border bg-background p-2 text-sm">
                        <span className="font-medium text-xs">{r.authorName ?? r.authorId.slice(0, 8)}</span>
                        <span className="text-xs text-muted-foreground ml-2">{formatRelativeTime(r.createdAt)}</span>
                        <p className="text-sm break-words mt-0.5">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── Pinned messages panel ─── */}
            {showPinnedPanel && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Pinned Messages</p>
                  <Button size="icon" variant="ghost" className="size-5" onClick={() => setShowPinnedPanel(false)}>
                    <X className="size-3" />
                  </Button>
                </div>
                {pinnedMessages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No pinned messages.</p>
                ) : (
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {pinnedMessages.map((m) => (
                      <div key={m.id} className="rounded border bg-background p-2 text-sm">
                        <span className="font-medium text-xs">{m.authorName ?? m.authorId.slice(0, 8)}</span>
                        <span className="text-xs text-muted-foreground ml-2">{formatRelativeTime(m.createdAt)}</span>
                        <p className="text-sm break-words mt-0.5">{m.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── Messages area ─── */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="relative max-h-[420px] space-y-0.5 overflow-y-auto rounded-md border p-3"
            >
              {isLoading ? (
                <>
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </>
              ) : messages.length === 0 ? (
                /* Item 11: Better empty state — no messages */
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquare className="size-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium">
                    This is the start of #{channel.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Say hello!</p>
                </div>
              ) : (
                <>
                  {onLoadEarlier && hasMore && (
                    <div className="flex justify-center py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={onLoadEarlier}
                      >
                        Load earlier messages
                      </Button>
                    </div>
                  )}
                  {messages.map((message, index) => {
                    const isGrouped = shouldGroup(messages[index - 1], message);

                    return (
                      <div
                        key={message.id}
                        className={`group rounded-md bg-background p-2 ${
                          message.isPending ? "opacity-60" : ""
                        } ${isGrouped ? "pt-0.5" : "border mt-2"}`}
                      >
                        {editingMessageId === message.id ? (
                          <div className="space-y-2">
                            <Textarea
                              rows={2}
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={!editText.trim() || isEditing}
                                onClick={() => {
                                  onEditMessage(message.id, editText.trim());
                                  setEditingMessageId(null);
                                  setEditText("");
                                }}
                              >
                                <Check className="size-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingMessageId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {message.isAgentMessage ? (
                              <AgentMessage
                                message={{
                                  id: message.id,
                                  content: message.content,
                                  createdAt: message.createdAt,
                                  agentMetadata: message.agentMetadata as any,
                                }}
                              />
                            ) : (
                              <>
                                {/* Item 2: Show header only for first message in group */}
                                {!isGrouped && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                                      {getUserInitials(message.authorName ?? message.authorId.slice(0, 8))}
                                    </div>
                                    <span className="text-xs font-medium">{message.authorName ?? message.authorId.slice(0, 8)}</span>
                                    {message.isPinned && <span className="text-xs" title="Pinned">📌</span>}
                                  </div>
                                )}
                                {/* Item 10: word-break for long messages */}
                                <p className={`text-sm break-words ${isGrouped ? "pl-8" : ""}`}>{message.content}</p>
                              </>
                            )}
                            <div className={`flex items-center justify-between mt-1 ${isGrouped ? "pl-8" : ""}`}>
                              <div className="flex items-center gap-2">
                                {/* Item 3: Relative timestamps */}
                                <p className="text-xs text-muted-foreground">
                                  {formatRelativeTime(message.createdAt)}
                                  {message.editedAt && " (edited)"}
                                </p>
                                {/* Item 9: Thread reply count */}
                                {message.threadReplyCount && message.threadReplyCount > 0 && (
                                  <button
                                    className="text-xs text-primary hover:underline"
                                    onClick={() => onOpenThread(message.id)}
                                  >
                                    {message.threadReplyCount} {message.threadReplyCount === 1 ? "reply" : "replies"}
                                  </button>
                                )}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="relative group/reaction">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-6"
                                    title="Add reaction"
                                  >
                                    <span className="text-xs">😀</span>
                                  </Button>
                                  <div className="absolute bottom-full left-0 mb-1 hidden group-hover/reaction:flex gap-1 rounded-lg border bg-popover p-1 shadow-lg z-50">
                                    {COMMON_EMOJIS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        className="rounded p-1 text-sm hover:bg-accent transition-colors"
                                        onClick={() => onToggleReaction?.(message.id, emoji)}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-6"
                                  title="Reply in thread"
                                  onClick={() => onOpenThread(message.id)}
                                >
                                  <Reply className="size-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-6"
                                  title="Edit"
                                  onClick={() => startEdit(message)}
                                >
                                  <Pencil className="size-3" />
                                </Button>
                                {/* Item 4: Delete opens confirmation dialog */}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-6"
                                  title="Delete"
                                  onClick={() => setPendingDeleteId(message.id)}
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-6"
                                  title={message.isPinned ? "Unpin" : "Pin"}
                                  onClick={() => onPinMessage?.(message.id)}
                                >
                                  <Pin className="size-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-6"
                                  title="Convert to task"
                                  onClick={() => onConvertToTask(message.id)}
                                >
                                  <ListTodo className="size-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-6"
                                  title="Convert to page"
                                  onClick={() => onConvertToPage(message.id)}
                                >
                                  <FileText className="size-3" />
                                </Button>
                              </div>
                            </div>
                            {/* Reactions display */}
                            {message.reactions && message.reactions.length > 0 && (
                              <div className={`flex flex-wrap gap-1 mt-1 ${isGrouped ? "pl-8" : ""}`}>
                                {message.reactions.map((r) => (
                                  <button
                                    key={r.emoji}
                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                                      r.hasReacted
                                        ? "border-primary/50 bg-primary/10"
                                        : "hover:bg-muted"
                                    }`}
                                    onClick={() => onToggleReaction?.(message.id, r.emoji)}
                                  >
                                    <span>{r.emoji}</span>
                                    <span className="text-muted-foreground">{r.count}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}

              {/* Item 1: Scroll-to-bottom FAB */}
              {showScrollButton && (
                <button
                  onClick={scrollToBottom}
                  className="sticky bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-full border bg-background px-3 py-1.5 text-xs shadow-md hover:bg-accent transition-colors"
                >
                  <ChevronDown className="size-3" />
                  New messages
                </button>
              )}
            </div>

            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                rows={3}
                placeholder="Write a message..."
                value={messageText}
                onChange={handleMessageInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && messageText.trim()) {
                    e.preventDefault();
                    onSendMessage(messageText.trim());
                    setMessageText("");
                  }
                }}
                className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              />
              {mentionQuery !== null && (
                <MentionAutocomplete
                  query={mentionQuery}
                  onSelect={handleMentionSelect}
                  onClose={() => setMentionQuery(null)}
                  position={mentionPosition}
                />
              )}
              <Button
                disabled={!messageText.trim() || isSending}
                onClick={() => {
                  onSendMessage(messageText.trim());
                  setMessageText("");
                }}
              >
                Send Message
              </Button>
            </div>
          </>
        )}
      </CardContent>

      {/* Item 4: Delete confirmation dialog */}
      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The message will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteId) {
                  onDeleteMessage(pendingDeleteId);
                  setPendingDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
