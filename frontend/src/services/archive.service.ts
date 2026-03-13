import { authHeaders } from "@/services/auth.service";
const BASE = "http://localhost:4000";



export interface ServerArchivedTask {
  id:               string;
  userEmail:        string;
  workspaceType:    string;
  workspaceId?:     string | null;
  encryptedPayload: { iv: number[]; payload: number[] };
  archivedAt:       number;
  restoredAt?:      number | null;
}

type ArchiveContext = {
  workspaceType: string;
  workspaceId?: string | null;
};

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
export async function apiRestoreTask(id: string, context: ArchiveContext, token: string): Promise<void> {
  const res = await fetch(`${BASE}/archive/${id}/restore`, {
    method:  "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(context),
  });
  if (!res.ok) throw new Error("restore failed");
}

// PATCH /archive/restore-all
export async function apiRestoreAllTasks(context: ArchiveContext, token: string): Promise<void> {
  const res = await fetch(`${BASE}/archive/restore-all`, {
    method:  "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(context),
  });
  if (!res.ok) throw new Error("restore-all failed");
}

// GET /archive  — 
export async function apiFetchArchivedTasks(
  context: ArchiveContext,
  token: string
): Promise<ServerArchivedTask[]> {
  const params = new URLSearchParams({ workspaceType: context.workspaceType });
  if (context.workspaceId) params.set("workspaceId", context.workspaceId);

  const res = await fetch(`${BASE}/archive?${params.toString()}`, {
    headers: authHeaders(token), 
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.tasks ?? []).map((task: any) => ({
    id: task._id ?? task.id,
    workspaceId: task.workspaceId ?? context.workspaceId ?? null,
    workspaceType: context.workspaceType,
    userEmail: task.userEmail ?? "",
    encryptedPayload: task.encryptedPayload,
    archivedAt: task.archivedAt,
    restoredAt: task.restoredAt ?? null,
  }));
}
