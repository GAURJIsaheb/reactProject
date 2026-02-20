import { authHeaders } from "@/api/authApi";

const API_BASE = "http://localhost:4000";

export async function apiCreateTask(task: any, token: string) {
  await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(task)
  });
}

export async function apiUpdateTask(id: string, payload: any, token: string) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error("update failed");
}

export async function apiDeleteTask(id: string, token: string) {
  await fetch(`${API_BASE}/tasks/${id}`, {
    method: "DELETE",
    headers: authHeaders(token)
  });
}

export async function apiShare(task: any, toEmail: string, token: string) {
  const res = await fetch(`${API_BASE}/share`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      toEmail,
      taskId: task.id,
      createdBy: task.userEmail,
      workspaceType: task.workspaceType
    })
  });

  if (!res.ok) throw new Error("share failed");
}