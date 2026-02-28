import { supabaseAdmin } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/logger";

const log = createLogger("user-resolver");

export interface UserMeta {
  email: string | null;
  displayName: string;
  firstName: string;
}

/**
 * Resolve display name and email for a Supabase user ID.
 * Falls back gracefully if the lookup fails.
 */
export async function resolveUserMeta(userId: string): Promise<UserMeta> {
  const fallback: UserMeta = {
    email: null,
    displayName: userId.slice(0, 8),
    firstName: "there",
  };

  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (data?.user) {
      const displayName =
        data.user.user_metadata?.full_name ||
        data.user.email?.split("@")[0] ||
        fallback.displayName;
      return {
        email: data.user.email ?? null,
        displayName,
        firstName: displayName.split(" ")[0] ?? "there",
      };
    }
  } catch (err) {
    log.warn({ err, userId }, "Failed to resolve user metadata");
  }

  return fallback;
}

/**
 * Batch-resolve display names for multiple user IDs.
 * Returns a Map of userId → UserMeta.
 */
export async function resolveUserMetaBatch(
  userIds: string[]
): Promise<Map<string, UserMeta>> {
  const results = new Map<string, UserMeta>();
  const unique = [...new Set(userIds)];

  await Promise.all(
    unique.map(async (id) => {
      results.set(id, await resolveUserMeta(id));
    })
  );

  return results;
}
