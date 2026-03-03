import { initDB } from "@/infrastructure/lib/idb";
import { authHeaders } from "@/services/auth.service";

const API_BASE = "http://localhost:4000";

// ─── Sync timestamp keys ──────────────────────────────────────────────────────
function taskSyncKey(workspaceId: string) {
  return `lastSyncedAt_${workspaceId}`;
}
function sectionSyncKey(workspaceType: string) {
  return `lastSectionSyncedAt_${workspaceType}`;
}

export function clearSyncTimestamps() {
  Object.keys(localStorage)
    .filter(
      (k) =>
        k.startsWith("lastSyncedAt_") ||
        k.startsWith("lastSectionSyncedAt_")
    )
    .forEach((k) => localStorage.removeItem(k));
}

// ─── Fetch workspaceId UUID from server ───────────────────────────────────────
export async function fetchWorkspaceId(
  workspaceType: string,
  token: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${API_BASE}/tasks/workspace-id?workspaceType=${workspaceType}`,
      { headers: authHeaders(token) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.workspaceId ?? null;
  } catch {
    return null;
  }
}

// ─── Pull sections + tasks in one go ─────────────────────────────────────────
// Returns true if anything changed 
export async function pullFromServer(
  workspaceId: string,
  workspaceType: string,
  token: string,
  userEmail: string
): Promise<boolean> {
  if (!navigator.onLine) return false;

  const [sectionsChanged, tasksChanged] = await Promise.all([
    pullSections(workspaceType, token, userEmail),
    pullTasks(workspaceId, workspaceType, token, userEmail),
  ]);

  return sectionsChanged || tasksChanged;
}

// ─── Pull sections delta ──────────────────────────────────────────────────────
async function pullSections(
  workspaceType: string,
  token: string,
  userEmail: string
): Promise<boolean> {
  const lastSyncedAt = localStorage.getItem(sectionSyncKey(workspaceType));

  const url =
    `${API_BASE}/sections/sync?workspaceType=${workspaceType}` +
    (lastSyncedAt ? `&lastSyncedAt=${lastSyncedAt}` : "");

  try {
    const res = await fetch(url, { headers: authHeaders(token) });
    if (!res.ok) return false;

    const { sections, syncedAt }: { sections: any[]; syncedAt: number } =
      await res.json();

    if (sections.length > 0) {
      await mergeSections(sections, userEmail, workspaceType);
    }

    localStorage.setItem(sectionSyncKey(workspaceType), String(syncedAt));
    return sections.length > 0;
  } catch {
    return false;
  }
}

// ─── Pull tasks delta ─────────────────────────────────────────────────────────
async function pullTasks(
  workspaceId: string,
  workspaceType: string,
  token: string,
  userEmail: string
): Promise<boolean> {
  const lastSyncedAt = localStorage.getItem(taskSyncKey(workspaceId));

  const url =
    `${API_BASE}/tasks/sync?workspaceId=${workspaceId}` +
    (lastSyncedAt ? `&lastSyncedAt=${lastSyncedAt}` : "");

  try {
    const res = await fetch(url, { headers: authHeaders(token) });
    if (!res.ok) return false;

    const { tasks, syncedAt }: { tasks: any[]; syncedAt: number } =
      await res.json();

    if (tasks.length > 0) {
      await mergeTasks(tasks, userEmail, workspaceType);
    }

    localStorage.setItem(taskSyncKey(workspaceId), String(syncedAt));
    return tasks.length > 0;
  } catch {
    return false;
  }
}

// ─── Merge sections into IDB ──────────────────────────────────────────────────
async function mergeSections(
  serverSections: any[],
  userEmail: string,
  workspaceType: string
): Promise<void> {
  const db = await initDB();
  const tx = db.transaction("sections", "readwrite");
  const store = tx.objectStore("sections");

  for (const section of serverSections) {
    await store.put({
      ...section,
      // IDB sections filter: userEmail + workspaceType
      userEmail,
      workspaceType,
    });
  }

  await tx.done;
}

// ─── Merge tasks into IDB ─────────────────────────────────────────────────────
async function mergeTasks(
  serverTasks: any[],
  userEmail: string,
  workspaceType: string
): Promise<void> {
  const db = await initDB();
  const tx = db.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");

  for (const task of serverTasks) {
    if (task.deleted) {
      await store.delete(task.id);
      continue;
    }

    const existing = await store.get(task.id);
    const localIsNewer =
      existing?.dirty && existing.updatedAt > task.updatedAt;

    if (!existing || !localIsNewer) {
      await store.put({
        ...task,
        userEmail,
        workspaceType,
        dirty: false,
        syncStatus: "synced",
      });
    }
  }

  await tx.done;
}
