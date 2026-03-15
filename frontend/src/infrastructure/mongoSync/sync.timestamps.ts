export const taskSyncKey         = (id: string) => `lastSyncedAt_${id}`;
export const sectionSyncKey      = (id: string) => `lastSectionSyncedAt_${id}`;
export const notificationSyncKey = (id: string) => `lastNotificationSyncedAt_${id}`;

export function clearSyncTimestamps(): void {
  Object.keys(localStorage)
    .filter(
      (k) =>
        k.startsWith("lastSyncedAt_") ||
        k.startsWith("lastSectionSyncedAt_") ||
        k.startsWith("lastNotificationSyncedAt_")
    )
    .forEach((k) => localStorage.removeItem(k));
}