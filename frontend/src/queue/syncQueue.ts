import { getQueue, removeFromQueue, addTask, getTaskById } from "@/lib/idb";
import { authHeaders } from "@/api/authApi";

const API_BASE = "http://localhost:4000";

export async function processQueue(token: string) {
  const queue = await getQueue();

  for (const item of queue) {
    try {
      if (item.action === "delete") {
        await fetch(`${API_BASE}/tasks/${item.taskId}`, {
          method: "DELETE",
          headers: authHeaders(token)
        });
      }

      if (item.action === "update") {
        await fetch(`${API_BASE}/tasks/${item.taskId}`, {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify(item.payload)
        });
      }

      //  mark task synced
      const task = await getTaskById(item.taskId);
      if (task) {
        await addTask({
          ...task,
          syncStatus: "synced"
        });
      }

      // remove job
      await removeFromQueue(item.id);

    } catch (err) {
      console.log("still offline");
      break;
    }
  }
}