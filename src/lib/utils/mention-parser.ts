/**
 * Mention parser for @username, @agent-name, @page:title patterns.
 * Parses raw text and extracts structured mention data.
 */

export interface ParsedMention {
  type: "user" | "agent" | "item";
  targetId: string;
  displayText: string;
  startOffset: number;
  endOffset: number;
}

export interface ParseResult {
  cleanContent: string;
  mentions: ParsedMention[];
}

// Matches @word (user/agent) and @page:word (item)
const MENTION_REGEX = /@(page:)?([a-zA-Z0-9_.-]+)/g;

/**
 * Parse mentions from raw message content.
 * Resolves mention targets against provided lookup maps.
 */
export function parseMentions(
  content: string,
  lookups: {
    users: Map<string, string>; // username -> userId
    agents: Map<string, string>; // agent-name -> beeInstanceId
    items: Map<string, string>; // page:title -> itemId
  }
): ParseResult {
  const mentions: ParsedMention[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  MENTION_REGEX.lastIndex = 0;

  while ((match = MENTION_REGEX.exec(content)) !== null) {
    const isPageMention = !!match[1];
    const name = match[2];
    const fullMatch = match[0];
    const startOffset = match.index;
    const endOffset = startOffset + fullMatch.length;

    if (isPageMention) {
      const itemId = lookups.items.get(name);
      if (itemId) {
        mentions.push({
          type: "item",
          targetId: itemId,
          displayText: fullMatch,
          startOffset,
          endOffset,
        });
      }
    } else {
      // Check agents first (they may have distinctive names)
      const agentId = lookups.agents.get(name);
      if (agentId) {
        mentions.push({
          type: "agent",
          targetId: agentId,
          displayText: fullMatch,
          startOffset,
          endOffset,
        });
        continue;
      }

      // Then check users
      const userId = lookups.users.get(name);
      if (userId) {
        mentions.push({
          type: "user",
          targetId: userId,
          displayText: fullMatch,
          startOffset,
          endOffset,
        });
      }
    }
  }

  return { cleanContent: content, mentions };
}

/**
 * Extract raw mention strings from content without resolving them.
 * Useful for quick scanning before doing DB lookups.
 */
export function extractMentionCandidates(content: string): {
  usernames: string[];
  agentNames: string[];
  pageNames: string[];
} {
  const usernames: string[] = [];
  const agentNames: string[] = [];
  const pageNames: string[] = [];
  let match: RegExpExecArray | null;

  MENTION_REGEX.lastIndex = 0;

  while ((match = MENTION_REGEX.exec(content)) !== null) {
    const isPage = !!match[1];
    const name = match[2];
    if (isPage) {
      pageNames.push(name);
    } else {
      // Both user and agent names collected; resolution happens at processing time
      usernames.push(name);
      agentNames.push(name);
    }
  }

  return { usernames, agentNames, pageNames };
}
