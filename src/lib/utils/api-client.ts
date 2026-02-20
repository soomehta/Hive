export function apiClient(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const orgId =
    typeof window !== "undefined"
      ? localStorage.getItem("hive-org-id")
      : null;

  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
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
