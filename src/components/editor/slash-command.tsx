"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Minus,
  type LucideIcon,
} from "lucide-react";

interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  command: (props: { editor: any; range: any }) => void;
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: "heading1",
    label: "Heading 1",
    description: "Large section heading",
    icon: Heading1,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    id: "heading2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: Heading2,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    id: "heading3",
    label: "Heading 3",
    description: "Small section heading",
    icon: Heading3,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    id: "bulletList",
    label: "Bullet List",
    description: "Create a bullet list",
    icon: List,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: "orderedList",
    label: "Numbered List",
    description: "Create a numbered list",
    icon: ListOrdered,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    id: "codeBlock",
    label: "Code Block",
    description: "Insert a code block",
    icon: Code,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    id: "blockquote",
    label: "Quote",
    description: "Insert a blockquote",
    icon: Quote,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    id: "horizontalRule",
    label: "Divider",
    description: "Insert a horizontal divider",
    icon: Minus,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

export interface SlashCommandListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

export const SlashCommandList = forwardRef<SlashCommandListRef, SuggestionProps<SlashCommandItem>>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = useCallback(
      (index: number) => {
        const item = props.items[index];
        if (item) {
          item.command({ editor: props.editor, range: props.range });
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
          setSelectedIndex((prev) => (prev <= 0 ? props.items.length - 1 : prev - 1));
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev >= props.items.length - 1 ? 0 : prev + 1));
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
          No commands found
        </div>
      );
    }

    return (
      <div className="rounded-md border bg-popover shadow-md overflow-hidden max-h-64 overflow-y-auto w-56">
        {props.items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-accent/50 ${
                index === selectedIndex ? "bg-accent text-accent-foreground" : ""
              }`}
              onClick={() => selectItem(index)}
            >
              <Icon className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    );
  },
);

SlashCommandList.displayName = "SlashCommandList";

export function getSlashCommandItems({ query }: { query: string }): SlashCommandItem[] {
  return SLASH_COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()),
  );
}
