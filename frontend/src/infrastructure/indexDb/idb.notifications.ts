import type { AppNotification } from "@/shared/types/notification";
import { initDB, STORE_NOTIFICATIONS, IDX_NOTIFICATIONS_BY_USER_WORKSPACE } from "./idb.init";

export async function upsertNotification(n: AppNotification): Promise<void> {
  await (await initDB()).put(STORE_NOTIFICATIONS, n);
}

export async function getAllNotifications(
  userEmail:     string,
  workspaceType: string
): Promise<AppNotification[]> {
  if (!userEmail) return [];
  const db  = await initDB();
  const all = await db.getAllFromIndex(
    STORE_NOTIFICATIONS,
    IDX_NOTIFICATIONS_BY_USER_WORKSPACE,
    IDBKeyRange.only([userEmail, workspaceType])
  );
  return all.filter((n) => !n.deleted).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getNotificationById(id: string): Promise<AppNotification | null> {
  if (!id) return null;
  return (await initDB()).get(STORE_NOTIFICATIONS, id);
}

export async function softDeleteNotificationInIDB(id: string): Promise<void> {
  if (!id) return;
  const db = await initDB();
  const e  = await db.get(STORE_NOTIFICATIONS, id);
  if (!e) return;
  await db.put(STORE_NOTIFICATIONS, {
    ...e,
    deleted:    true,
    deletedAt:  Date.now(),
    updatedAt:  Date.now(),
    syncStatus: "pending",
  });
}

export async function markAllNotificationsReadInIDB(
  userEmail:     string,
  workspaceType: string
): Promise<void> {
  const db  = await initDB();
  const all = await db.getAll(STORE_NOTIFICATIONS);
  const tx  = db.transaction(STORE_NOTIFICATIONS, "readwrite");
  for (const n of all)
    if (n.userEmail === userEmail && n.workspaceType === workspaceType && !n.deleted && !n.read)
      tx.store.put({ ...n, read: true, updatedAt: Date.now() });
  await tx.done;
}

export async function mergeNotificationsFromServer(
  serverNotifications: AppNotification[]
): Promise<void> {
  if (!serverNotifications.length) return;
  const db = await initDB();
  const tx = db.transaction(STORE_NOTIFICATIONS, "readwrite");
  for (const n of serverNotifications) {
    const e          = await tx.store.get(n.id);
    const localNewer = e?.syncStatus === "pending" && e.updatedAt > n.updatedAt;
    if (!localNewer) tx.store.put({ ...n, syncStatus: "synced" });
  }
  await tx.done;
}