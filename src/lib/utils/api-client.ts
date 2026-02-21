export function apiClient(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Read orgId from Zustand's persisted state (stored under "hive-org")
  let orgId: string | null = null;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("hive-org");
      if (raw) {
        const parsed = JSON.parse(raw);
        orgId = parsed?.state?.orgId ?? null;
      }
    } catch {
      // Corrupted localStorage — ignore
    }
  }

  const headers = new Headers(options.headers);
  // Don't override Content-Type for FormData (browser sets multipart boundary)
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (orgId) {
    headers.set("x-org-id", orgId);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
