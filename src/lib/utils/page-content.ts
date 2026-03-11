/**
 * Build minimal ProseMirror-style doc JSON from plain text.
 * Single paragraph; safe for API contentJson.
 */
export function docFromPlainText(plainText: string): Record<string, unknown> {
  const text = plainText.trim();
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text ? [{ type: "text", text }] : [],
      },
    ],
  };
}

type ContentNode = { type: string; text?: string; content?: ContentNode[] };

function collectTextFromNode(node: ContentNode): string {
  if (node.type === "text" && typeof node.text === "string") return node.text;
  if (!Array.isArray(node.content)) return "";
  return node.content.map(collectTextFromNode).join("");
}

/**
 * Extract plain text from stored contentJson (ProseMirror doc: paragraphs, headings, lists, etc.).
 */
export function plainTextFromDoc(doc: Record<string, unknown> | null): string {
  if (!doc || doc.type !== "doc") return "";
  const content = doc.content as ContentNode[] | undefined;
  if (!Array.isArray(content)) return "";
  return content.map(collectTextFromNode).filter(Boolean).join("\n\n");
}
