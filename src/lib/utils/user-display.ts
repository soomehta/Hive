/**
 * Extract display name from various user data shapes.
 * Works with Supabase auth metadata or organization member objects.
 */
export function getUserDisplayName(user: {
  email?: string | null;
  fullName?: string | null;
  displayName?: string | null;
  userId?: string;
  id?: string;
} | null | undefined): string {
  if (!user) return "Unknown";
  return (
    user.displayName ||
    user.fullName ||
    user.email?.split("@")[0] ||
    user.userId?.slice(0, 8) ||
    user.id?.slice(0, 8) ||
    "Unknown"
  );
}

export function getUserInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

export function formatMinutes(mins: number): string {
  if (!mins || mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
