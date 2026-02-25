// frontend/src/queue/syncQueue.ts
import { getQueue, removeFromQueue, addTask, getTaskById } from "@/lib/idb";
import { authHeaders } from "@/api/authApi";

const API_BASE = "http://localhost:4000";



export async function processQueue(token: string) {

   // ── if Offline do nothing──
  if (!navigator.onLine) return;
  const queue = await getQueue();
  if (queue.length === 0) return;

  // ── Guard: if queue is running already,then skip ──
  if ((processQueue as any)._running) return;
  (processQueue as any)._running = true;

  const creates = queue.filter(i => i.action === "create");
  const updates = queue.filter(i => i.action === "update");
  const deletes = queue.filter(i => i.action === "delete");

  try {
    if (creates.length > 0) {
      const res = await fetch(`${API_BASE}/tasks/bulk-create`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ tasks: creates.map(i => i.payload) })
      });
      if (!res.ok) throw new Error("bulk-create failed");
    }

    if (updates.length > 0) {
      const res = await fetch(`${API_BASE}/tasks/bulk-update`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({
          updates: updates.map(i => ({ taskId: i.taskId, payload: i.payload }))
        })
      });
      if (!res.ok) throw new Error("bulk-update failed");
    }

    if (deletes.length > 0) {
      const res = await fetch(`${API_BASE}/tasks/bulk-delete`, {
        method: "DELETE",
        headers: authHeaders(token),
        body: JSON.stringify({ taskIds: deletes.map(i => i.taskId) })
      });
      if (!res.ok) throw new Error("bulk-delete failed");
    }

    // Everything success,,clear the queue
    for (const item of queue) {
      const task = await getTaskById(item.taskId);
      if (task) await addTask({ ...task, syncStatus: "synced" });
      await removeFromQueue(item.id);
    }

  } catch (err) {
    console.log("Bulk sync failed:", err); 
  } finally {
    (processQueue as any)._running = false; 
  }
}