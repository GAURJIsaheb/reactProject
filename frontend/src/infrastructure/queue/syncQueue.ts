import { getQueue, removeFromQueue, addTask, getTaskById, updateQueue } from "@/infrastructure/indexDb/idb";
import { authHeaders } from "@/services/auth.service";

const API_BASE = "http://localhost:4000";
const MAX_RETRY = 5;

export async function processQueue(token: string) {
  if (!navigator.onLine) return;
  if ((processQueue as any)._running) return;

  const queue = await getQueue();
  if (queue.length === 0) return;

  (processQueue as any)._running = true;

  const eligible = queue.filter((i) => (i.retry ?? 0) < MAX_RETRY);
  const exhausted = queue.filter((i) => (i.retry ?? 0) >= MAX_RETRY);

  for (const item of exhausted) {
    console.warn(`Dropping job ${item.id} after ${MAX_RETRY} retries`);
    await removeFromQueue(item.id);
  }

  if (eligible.length === 0) {
    (processQueue as any)._running = false;
    return;
  }

  const creates = eligible.filter((i) => i.action === "create");
  const updates = eligible.filter((i) => i.action === "update");
  const deletes = eligible.filter((i) => i.action === "delete");
  const notificationDeletes = eligible.filter(
    (i) => i.action === "notification-delete"
  );

  try {
    if (creates.length > 0) {
      const res = await fetch(`${API_BASE}/tasks/bulk-create`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ tasks: creates.map((i) => i.payload) }),
      });
      if (!res.ok) throw new Error("bulk-create failed");
    }

    if (updates.length > 0) {
      const res = await fetch(`${API_BASE}/tasks/bulk-update`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({
          updates: updates.map((i) => ({ taskId: i.taskId, payload: i.payload })),
        }),
      });
      if (!res.ok) throw new Error("bulk-update failed");
    }

    if (deletes.length > 0) {
      const res = await fetch(`${API_BASE}/tasks/bulk-delete`, {
        method: "DELETE",
        headers: authHeaders(token),
        body: JSON.stringify({ taskIds: deletes.map((i) => i.taskId) }),
      });
      if (!res.ok) throw new Error("bulk-delete failed");
    }

    if (notificationDeletes.length > 0) {
      const res = await fetch(`${API_BASE}/notifications/bulk-delete`, {
        method: "DELETE",
        headers: authHeaders(token),
        body: JSON.stringify({
          notificationIds: notificationDeletes.map((i) => i.taskId),
        }),
      });
      if (!res.ok) throw new Error("bulk-notification-delete failed");
    }

    for (const item of eligible) {
      if (item.action !== "notification-delete") {
        const task = await getTaskById(item.taskId);
        if (task) await addTask({ ...task, syncStatus: "synced" });
      }
      await removeFromQueue(item.id);
    }
  } catch (err) {
    console.warn("Bulk sync failed, incrementing retry counts:", err);

    for (const item of eligible) {
      await updateQueue({ ...item, retry: (item.retry ?? 0) + 1 });
    }
  } finally {
    (processQueue as any)._running = false;
  }
}
