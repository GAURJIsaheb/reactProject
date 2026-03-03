const BASE = "http://localhost:4000";

function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization:  `Bearer ${token}`,
  };
}

export interface ServerArchivedTask {
  id:               string;
  userEmail:        string;
  workspaceType:    string;
  encryptedPayload: { iv: number[]; payload: number[] };
  archivedAt:       number;
  restoredAt?:      number | null;
}

// POST /archive/bulk
export async function apiArchiveTasks(
  tasks: ServerArchivedTask[],
  token: string
): Promise<void> {
  const res = await fetch(`${BASE}/archive/bulk`, {
    method:  "POST",
    headers: authHeaders(token),
    body:    JSON.stringify({ tasks }),
  });
  if (!res.ok) throw new Error("archive failed");
}

// PATCH /archive/:id/restore
export async function apiRestoreTask(id: string, token: string): Promise<void> {
  const res = await fetch(`${BASE}/archive/${id}/restore`, {
    method:  "PATCH",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("restore failed");
}

// PATCH /archive/restore-all
export async function apiRestoreAllTasks(token: string): Promise<void> {
  const res = await fetch(`${BASE}/archive/restore-all`, {
    method:  "PATCH",
    headers: authHeaders(token),
    // userEmail nahi chahiye — backend token se userId lete hai
  });
  if (!res.ok) throw new Error("restore-all failed");
}

// GET /archive  — backend token se userId filter karta hai
export async function apiFetchArchivedTasks(
  token: string
): Promise<ServerArchivedTask[]> {
  const res = await fetch(`${BASE}/archive`, {
    headers: authHeaders(token),  // ← userEmail query param hata diya
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.tasks ?? [];
}