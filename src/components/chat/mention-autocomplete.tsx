"use client";

import { useEffect, useState, useCallback } from "react";
import { User, Bot, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrg } from "@/hooks/use-org";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MentionSuggestion {
  id: string;
  name: string;
  type: "user" | "agent" | "item";
}

interface MentionAutocompleteProps {
  /** The text typed after the @ character, used to filter suggestions. */
  query: string;
  /** Called when the user confirms a suggestion via click or Enter. */
  onSelect: (mention: MentionSuggestion) => void;
  /** Called when the user dismisses the dropdown (Escape key). */
  onClose: () => void;
  /** Pixel position of the @ character in the editor, for absolute placement. */
  position: { top: number; left: number };
}

// ─── Icon and colour maps ─────────────────────────────────────────────────────

const iconMap: Record<MentionSuggestion["type"], React.ElementType> = {
  user: User,
  agent: Bot,
  item: FileText,
};

const colorMap: Record<MentionSuggestion["type"], string> = {
  user: "text-blue-500",
  agent: "text-purple-500",
  item: "text-green-500",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MentionAutocomplete({
  query,
  onSelect,
  onClose,
  position,
}: MentionAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { orgId } = useOrg();

  // Fetch suggestions whenever the query changes.
  // An AbortController ensures stale in-flight requests are cancelled.
  useEffect(() => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    fetch(`/api/mentions/search?q=${encodeURIComponent(query)}`, {
      headers: { "x-org-id": orgId ?? "" },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setSuggestions(data.data ?? []))
      .catch(() => {
        // Ignore AbortError and network failures — UX degrades gracefully.
      });

    return () => controller.abort();
  }, [query, orgId]);

  // Reset highlighted row when the suggestion list changes.
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Keyboard navigation: Arrow keys, Enter, Escape.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && suggestions[selectedIndex]) {
        e.preventDefault();
        onSelect(suggestions[selectedIndex]);
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [suggestions, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (suggestions.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Mention suggestions"
      className={cn(
        "fixed z-50 w-64 rounded-lg border bg-popover p-1 shadow-lg",
        "animate-in fade-in-0 zoom-in-95"
      )}
      style={{ top: position.top, left: position.left }}
    >
      {suggestions.map((suggestion, i) => {
        const Icon = iconMap[suggestion.type];
        const isHighlighted = i === selectedIndex;

        return (
          <button
            key={suggestion.id}
            role="option"
            aria-selected={isHighlighted}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              isHighlighted
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => setSelectedIndex(i)}
          >
            <Icon
              className={cn("size-4 shrink-0", colorMap[suggestion.type])}
              aria-hidden="true"
            />
            <span className="truncate">{suggestion.name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {suggestion.type}
            </span>
          </button>
        );
      })}
    </div>
  );
}
