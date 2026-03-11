"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";

export interface MentionItem {
  id: string;
  label: string;
}

export interface SuggestionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

export const MentionList = forwardRef<SuggestionListRef, SuggestionProps<MentionItem>>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = useCallback(
      (index: number) => {
        const item = props.items[index];
        if (item) {
          props.command(item);
        }
      },
      [props],
    );

    useEffect(() => {
      setSelectedIndex(0);
    }, [props.items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) =>
            prev <= 0 ? props.items.length - 1 : prev - 1,
          );
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) =>
            prev >= props.items.length - 1 ? 0 : prev + 1,
          );
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (props.items.length === 0) {
      return (
        <div className="rounded-md border bg-popover p-2 shadow-md text-xs text-muted-foreground">
          No results
        </div>
      );
    }

    return (
      <div className="rounded-md border bg-popover shadow-md overflow-hidden max-h-48 overflow-y-auto">
        {props.items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-accent/50 ${
              index === selectedIndex ? "bg-accent text-accent-foreground" : ""
            }`}
            onClick={() => selectItem(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  },
);

MentionList.displayName = "MentionList";
