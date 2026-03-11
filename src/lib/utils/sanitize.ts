/**
 * Strip all HTML tags from a string.
 * Used server-side in API routes where DOMPurify+jsdom is unavailable.
 */
function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

/**
 * Sanitize a Tiptap/ProseMirror JSON document by recursively cleaning
 * text nodes and attributes that could contain XSS payloads.
 */
export function sanitizeContentJson(doc: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(doc), (_key, value) => {
    if (typeof value === "string") {
      return stripHtml(value);
    }
    return value;
  });
}

/**
 * Sanitize plain text content (strip all HTML).
 */
export function sanitizePlainText(text: string): string {
  return stripHtml(text);
}

/**
 * Sanitize rich HTML content (allow safe formatting tags only).
 * For server-side use, strips dangerous tags while keeping allowed ones.
 */
export function sanitizeHtml(html: string): string {
  const allowedTags = new Set([
    "p", "br", "strong", "em", "s", "u", "code", "pre",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "hr", "a", "span",
  ]);
  const allowedAttrs = new Set(["href", "target", "rel", "class", "data-type", "data-id"]);

  // Remove script/style tags and their content entirely
  let result = html.replace(/<(script|style|iframe|object|embed|form|input|textarea|button)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  result = result.replace(/<(script|style|iframe|object|embed|form|input|textarea|button)\b[^>]*\/?>/gi, "");

  // Remove event handlers (on*)
  result = result.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");

  // Remove javascript: and data: URLs
  result = result.replace(/\s+href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, "");
  result = result.replace(/\s+href\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, "");

  // Strip disallowed tags but keep their content
  result = result.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g, (match, tag) => {
    const tagLower = tag.toLowerCase();
    if (!allowedTags.has(tagLower)) return "";

    // For allowed tags, strip disallowed attributes
    return match.replace(/\s+([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/g, (attrMatch, attrName) => {
      return allowedAttrs.has(attrName.toLowerCase()) ? attrMatch : "";
    });
  });

  return result;
}
