/**
 * In-memory cache for org member display names.
 * Avoids calling supabaseAdmin.auth.admin.getUserById() for every
 * org member on every PA chat message.
 *
 * TTL: 5 minutes. Keyed by orgId.
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  names: Map<string, string>;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedUserNames(orgId: string): Map<string, string> | null {
  const entry = cache.get(orgId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(orgId);
    return null;
  }
  return entry.names;
}

export function setCachedUserNames(orgId: string, names: Map<string, string>): void {
  cache.set(orgId, {
    names,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}
