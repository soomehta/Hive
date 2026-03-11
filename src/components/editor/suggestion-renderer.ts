import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance } from "tippy.js";
import type { SuggestionOptions } from "@tiptap/suggestion";
import {
  MentionList,
  type MentionItem,
  type SuggestionListRef,
} from "./mention-suggestion";

export function createSuggestionRenderer(
  fetchItems: (query: string) => Promise<MentionItem[]> | MentionItem[],
): Omit<SuggestionOptions<MentionItem>, "editor"> {
  return {
    items: async ({ query }) => {
      return fetchItems(query);
    },
    render: () => {
      let component: ReactRenderer<SuggestionListRef> | null = null;
      let popup: Instance[] | null = null;

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) return;

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },

        onUpdate(props) {
          component?.updateProps(props);

          if (popup && props.clientRect) {
            popup[0]?.setProps({
              getReferenceClientRect: props.clientRect as () => DOMRect,
            });
          }
        },

        onKeyDown(props) {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide();
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },

        onExit() {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
}
