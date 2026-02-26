// Returns true if the error is a plain network failure (offline, DNS, timeout)
// Returns false for auth errors, 4xx, 5xx, or anything unexpected
export function isNetworkError(err: unknown): boolean {
  return (
    err instanceof TypeError &&
    (err.message.includes("fetch") ||
      err.message.includes("network") ||
      err.message.includes("Failed to fetch"))
  );
}

export function logSyncError(context: string, err: unknown) {
  if (isNetworkError(err)) {
    // Expected offline behavior — not worth logging as a warning
    return;
  }
  console.warn(`[Sync Error] ${context}:`, err);
}