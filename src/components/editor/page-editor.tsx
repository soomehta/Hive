"use client";

import { useEditor, EditorContent, type Content } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import { useCallback, useEffect, useMemo } from "react";
import { plainTextFromDoc } from "@/lib/utils/page-content";
import { EditorToolbar } from "./editor-toolbar";
import { createSuggestionRenderer } from "./suggestion-renderer";
import type { MentionItem } from "./mention-suggestion";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Strikethrough, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlashCommands } from "./slash-command-extension";

export interface PageEditorProps {
  initialContent: Record<string, unknown> | null;
  placeholder?: string;
  onChange?: (contentJson: Record<string, unknown>, plainText: string) => void;
  editable?: boolean;
  className?: string;
  /** Provide to enable @mentions. Called with query string, return matching users. */
  onQueryUsers?: (query: string) => Promise<MentionItem[]> | MentionItem[];
  /** Provide to enable #item references. Called with query string, return matching items. */
  onQueryItems?: (query: string) => Promise<MentionItem[]> | MentionItem[];
}

function docToTiptapContent(doc: Record<string, unknown> | null): Content {
  if (!doc || doc.type !== "doc") {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
  const content = doc.content;
  if (!Array.isArray(content) || content.length === 0) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
  return doc as Content;
}

export function PageEditor({
  initialContent,
  placeholder = "Write something…",
  onChange,
  editable = true,
  className = "",
  onQueryUsers,
  onQueryItems,
}: PageEditorProps) {
  const userMention = useMemo(
    () =>
      onQueryUsers
        ? Mention.configure({
            HTMLAttributes: { class: "mention mention-user" },
            suggestion: {
              char: "@",
              ...createSuggestionRenderer(onQueryUsers),
            },
          })
        : null,
    [onQueryUsers],
  );

  const itemMention = useMemo(
    () =>
      onQueryItems
        ? Mention.extend({ name: "itemReference" }).configure({
            HTMLAttributes: { class: "mention mention-item" },
            suggestion: {
              char: "#",
              ...createSuggestionRenderer(onQueryItems),
            },
          })
        : null,
    [onQueryItems],
  );

  const extensions = useMemo(() => {
    const exts: any[] = [
      StarterKit,
      Placeholder.configure({ placeholder }),
      SlashCommands,
    ];
    if (userMention) exts.push(userMention);
    if (itemMention) exts.push(itemMention);
    return exts;
  }, [placeholder, userMention, itemMention]);

  const editor = useEditor({
    extensions,
    content: docToTiptapContent(initialContent),
    editable,
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[280px] px-3 py-2 focus:outline-none",
      },
    },
  });

  const emitChange = useCallback(() => {
    if (!editor || !onChange) return;
    const json = editor.getJSON();
    const plain = plainTextFromDoc(json as Record<string, unknown>);
    onChange(json as Record<string, unknown>, plain);
  }, [editor, onChange]);

  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => emitChange();
    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, emitChange]);

  if (!editor) return null;

  return (
    <div className={cn("overflow-hidden", className)}>
      {editable && <EditorToolbar editor={editor} />}

      {/* Bubble menu for inline formatting on selection */}
      {editable && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md"
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn("size-7", editor.isActive("bold") && "bg-accent")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            aria-label="Bold"
          >
            <Bold className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn("size-7", editor.isActive("italic") && "bg-accent")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Italic"
          >
            <Italic className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn("size-7", editor.isActive("strike") && "bg-accent")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            aria-label="Strikethrough"
          >
            <Strikethrough className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn("size-7", editor.isActive("code") && "bg-accent")}
            onClick={() => editor.chain().focus().toggleCode().run()}
            aria-label="Inline code"
          >
            <Code className="size-3.5" />
          </Button>
        </BubbleMenu>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
