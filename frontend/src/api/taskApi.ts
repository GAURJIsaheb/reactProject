import { authHeaders } from "@/api/authApi";
import { addTask } from "@/lib/idb";

const API_BASE = "http://localhost:4000";

export async function fetchFromServer(
  userEmail: string,
  workspace: string,
  token: string
) {
  if (!userEmail || !token) return;

  try {
    const res = await fetch(`${API_BASE}/tasks?workspaceType=${workspace}`, {
      headers: authHeaders(token),
    });

    if (!res.ok) throw new Error("fetch failed");

    const serverTasks = await res.json();
    console.log("SERVER → LOCAL SYNC:", serverTasks.length);

    for (const t of serverTasks) {
      await addTask({
        id:            t.taskId,
        text:          t.text,
        image:         t.image ?? null,
        completed:     t.completed,
        archived:      t.archived,
        deleted:       t.deleted,
        sectionId:     t.sectionId ?? null,   
        createdAt:     t.createdAt,
        updatedAt:     t.updatedAt,
        userEmail,
        workspaceType: workspace,
        syncStatus:    "synced",
      });
    }
  } catch (err) {
    console.warn("SERVER SYNC FAILED", err);
  }
}

export async function apiCreateTask(task: any, token: string) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method:  "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      id:            task.id,
      text:          task.text,
      image:         task.image ?? null,
      workspaceType: task.workspaceType,
      sectionId:     task.sectionId ?? null,  
    }),
  });

  if (!res.ok) throw new Error("create failed");
}

export async function apiUpdateTask(id: string, payload: any, token: string) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method:  "PUT",
    headers: authHeaders(token),
    body:    JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("update failed");
}

export async function apiDeleteTask(id: string, token: string) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method:  "DELETE",
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("delete failed");
}