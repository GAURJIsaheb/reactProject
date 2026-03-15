import { mergeNotificationsFromServer } from "@/infrastructure/indexDb/idb";
import { authHeaders }                  from "@/services/auth.service";
import { API_BASE }                     from "./sync.config";
import { notificationSyncKey }          from "./sync.timestamps";

export async function pullNotifications(
  workspaceType: string,
  token:         string,
  userEmail:     string
): Promise<boolean> {
  const lastSyncedAt = localStorage.getItem(notificationSyncKey(workspaceType));
  const url =
    `${API_BASE}/notifications/sync?workspaceType=${workspaceType}` +
    (lastSyncedAt ? `&lastSyncedAt=${lastSyncedAt}` : "");

  try {
    const res = await fetch(url, { headers: authHeaders(token) });
    if (!res.ok) return false;

    const { notifications, syncedAt }: { notifications: any[]; syncedAt: number } =
      await res.json();

    if (notifications.length > 0) {
      await mergeNotificationsFromServer(
        notifications.map((n) => ({
          ...n,
          userEmail,
          workspaceType,
          syncStatus: "synced",
        }))
      );
    }

    localStorage.setItem(notificationSyncKey(workspaceType), String(syncedAt));
    return notifications.length > 0;
  } catch {
    return false;
  }
}