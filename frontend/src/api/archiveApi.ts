
// MongoDB "archive" collection API calls

const BASE = "http://localhost:4000";

export interface ServerArchivedTask {
  id: string;
  userEmail: string;
  workspaceType: string;
  encryptedPayload: { iv: number[]; payload: number[] };
  archivedAt: number;
  restoredAt?: number | null;
}

// Archive tasks → POST /archive (bulk)
export async function apiArchiveTasks(
  tasks: ServerArchivedTask[],
  token: string
): Promise<void> {
  await fetch(`${BASE}/archive/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tasks }),
  });
}

// Restore a task → PATCH /archive/:id/restore  (soft delete in mongo — sets restoredAt)
export async function apiRestoreTask(id: string, token: string): Promise<void> {
  await fetch(`${BASE}/archive/${id}/restore`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Restore ALL → PATCH /archive/restore-all
export async function apiRestoreAllTasks(
  userEmail: string,
  token: string
): Promise<void> {
  await fetch(`${BASE}/archive/restore-all`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userEmail }),
  });
}

// Fetch archived tasks from server (for sync)
export async function apiFetchArchivedTasks(
  userEmail: string,
  token: string
): Promise<ServerArchivedTask[]> {
  const res = await fetch(`${BASE}/archive?userEmail=${userEmail}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.tasks ?? [];
}