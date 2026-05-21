import { authHeaders } from "./auth.service";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export async function apiDeleteNotification(
  notificationId: string,
  token: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/notifications/${notificationId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("delete notification failed");
}

export async function apiMarkAllNotificationsRead(
  workspaceType: string,
  token: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ workspaceType }),
  });
  if (!res.ok) throw new Error("mark-all-read failed");
}
