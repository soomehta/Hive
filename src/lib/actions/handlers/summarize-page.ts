import { getPageByItemId } from "@/lib/db/queries/pages";
import { getItemById } from "@/lib/db/queries/items";
import { chatCompletion } from "@/lib/ai/providers";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleSummarizePage(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.itemId) {
    return { success: false, error: "itemId is required to summarize a page" };
  }

  const item = await getItemById(payload.itemId, action.orgId);
  if (!item || item.type !== "page") {
    return { success: false, error: "Page not found" };
  }

  const page = await getPageByItemId(payload.itemId, action.orgId);
  if (!page) {
    return { success: false, error: "Page content not found" };
  }

  const pageContent = page.plainText?.slice(0, 5000) || "(empty page)";

  // Use AI to generate a concise summary
  let summary: string;
  try {
    summary = await chatCompletion("planner", {
      messages: [
        {
          role: "system",
          content:
            "You are a concise summarizer. Given a page's title and content, produce a clear 2-4 sentence summary capturing the key points. Do not use markdown formatting.",
        },
        {
          role: "user",
          content: `Title: ${item.title}\n\nContent:\n${pageContent}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 300,
    });
  } catch {
    // Fallback to basic excerpt if AI call fails
    summary = pageContent.slice(0, 300) + (pageContent.length > 300 ? "..." : "");
  }

  return {
    success: true,
    result: {
      itemId: payload.itemId,
      title: item.title,
      summary,
    },
  };
}
