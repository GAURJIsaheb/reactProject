import { initDB} from "@/infrastructure/lib/idb";
import { authHeaders } from "@/services/auth.service";
import { mergeNotificationsFromServer } from "@/infrastructure/lib/idb";
import { pruneSyncedTasksMissingOnServer } from "@/infrastructure/lib/idb";
import { pruneSyncedSectionsMissingOnServer } from "@/infrastructure/lib/idb";
import { normalizeSubtasks } from "@/shared/lib/subtasks";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function isBuiltInWorkspaceType(workspaceType: string) {
  return workspaceType === "personal" || workspaceType === "professional";
}

// ─── Sync timestamp keys ──────────────────────────────────────────────────────
// For collab workspaces we key by the server workspaceId so each member gets
// their own independent delta cursor. Personal workspaces still key by type.
function taskSyncKey(id: string)         { return `lastSyncedAt_${id}`; }
function sectionSyncKey(id: string)      { return `lastSectionSyncedAt_${id}`; }
function notificationSyncKey(id: string) { return `lastNotificationSyncedAt_${id}`; }

export function clearSyncTimestamps() {
  Object.keys(localStorage)
    .filter(
      (k) =>
        k.startsWith("lastSyncedAt_") ||
        k.startsWith("lastSectionSyncedAt_") ||
        k.startsWith("lastNotificationSyncedAt_")
    )
    .forEach((k) => localStorage.removeItem(k));
}

// ─── Fetch workspaceId UUID from server ───────────────────────────────────────
export async function fetchWorkspaceId(
  workspaceType: string,
  token: string
): Promise<string | null> {
  if (!isBuiltInWorkspaceType(workspaceType)) return null;

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
export async function pullFromServer(
  workspaceId:   string,   // server UUID for tasks + collab section lookup
  workspaceType: string,   // slug used for personal sections + notification key
  token:         string,
  userEmail:     string,
  isCollab:      boolean = false
): Promise<boolean> {
  if (!navigator.onLine) return false;

  const [sectionsChanged, tasksChanged, notificationsChanged] = await Promise.all([
    pullSections(workspaceId, workspaceType, token, userEmail, isCollab),
    pullTasks(workspaceId, workspaceType, token, userEmail, isCollab),
    pullNotifications(workspaceType, token, userEmail),
  ]);

  return sectionsChanged || tasksChanged || notificationsChanged;
}

// ─── Pull sections delta ──────────────────────────────────────────────────────
async function pullSections(
  workspaceId:   string,
  workspaceType: string,
  token:         string,
  userEmail:     string,
  isCollab:      boolean
): Promise<boolean> {
  // Key by workspaceId for collab (shared cursor), by type for personal
  const syncKey     = isCollab ? sectionSyncKey(workspaceId) : sectionSyncKey(workspaceType);
  const lastSyncedAt = localStorage.getItem(syncKey);

  // Collab: query by workspaceId so server returns ALL members' sections
  // Personal: query by workspaceType (original behaviour)
  const param = isCollab
    ? `workspaceId=${workspaceId}`
    : `workspaceType=${workspaceType}`;

  // For collab: NEVER send lastSyncedAt on the very first pull for this user
  // so they always get the full history. After that, delta is fine.
  const deltaParam = lastSyncedAt ? `&lastSyncedAt=${lastSyncedAt}` : "";
  const url = `${API_BASE}/sections/sync?${param}${deltaParam}`;

  try {
    const res = await fetch(url, { headers: authHeaders(token) });
    if (!res.ok) return false;

    const { sections, syncedAt }: { sections: any[]; syncedAt: number } = await res.json();

    if (sections.length > 0) {
      await mergeSections(sections, userEmail, workspaceType, isCollab ? workspaceId : undefined);
    }

    const currentParams = new URLSearchParams({ workspaceType });
    if (workspaceId) currentParams.set("workspaceId", workspaceId);
    const currentRes = await fetch(`${API_BASE}/sections?${currentParams.toString()}`, {
      headers: authHeaders(token),
    });
    const currentSections = currentRes.ok ? await currentRes.json() : [];
    if (currentSections.length > 0) {
      await mergeSections(currentSections, userEmail, workspaceType, isCollab ? workspaceId : undefined);
    }
    const pruned = await pruneSyncedSectionsMissingOnServer(
      userEmail,
      workspaceType,
      currentSections.map((section: any) => section.sectionId ?? section.id).filter(Boolean),
      workspaceId
    );

    localStorage.setItem(syncKey, String(syncedAt));
    return sections.length > 0 || currentSections.length > 0 || pruned > 0;
  } catch {
    return false;
  }
}

// ─── Pull tasks delta ─────────────────────────────────────────────────────────
async function pullTasks(
  workspaceId:   string,
  workspaceType: string,
  token:         string,
  userEmail:     string,
  isCollab:      boolean
): Promise<boolean> {
  const syncKey      = taskSyncKey(workspaceId);
  const lastSyncedAt = localStorage.getItem(syncKey);

  // For collab: on first pull by this user, omit lastSyncedAt so we get ALL
  // historical tasks, not just deltas since some arbitrary timestamp.
  const deltaParam = lastSyncedAt ? `&lastSyncedAt=${lastSyncedAt}` : "";
  const url = `${API_BASE}/tasks/sync?workspaceId=${workspaceId}${deltaParam}`;

  try {
    const res = await fetch(url, { headers: authHeaders(token) });
    if (!res.ok) return false;

    const { tasks, syncedAt }: { tasks: any[]; syncedAt: number } = await res.json();

    if (tasks.length > 0) {
      await mergeTasks(tasks, userEmail, workspaceType, isCollab ? workspaceId : undefined);
    }

    const currentParams = new URLSearchParams({ workspaceType });
    if (workspaceId) currentParams.set("workspaceId", workspaceId);
    const currentRes = await fetch(`${API_BASE}/tasks?${currentParams.toString()}`, {
      headers: authHeaders(token),
    });
    const currentTasks = currentRes.ok ? await currentRes.json() : [];
    if (currentTasks.length > 0) {
      await mergeTasks(currentTasks, userEmail, workspaceType, isCollab ? workspaceId : undefined);
    }
    const pruned = await pruneSyncedTasksMissingOnServer(
      userEmail,
      workspaceType,
      currentTasks.map((task: any) => task.taskId ?? task.id).filter(Boolean),
      workspaceId
    );

    localStorage.setItem(syncKey, String(syncedAt));
    return tasks.length > 0 || pruned > 0;
  } catch {
    return false;
  }
}

// ─── Pull notifications delta ─────────────────────────────────────────────────
async function pullNotifications(
  workspaceType: string,
  token:         string,
  userEmail:     string
): Promise<boolean> {
  const lastSyncedAt = localStorage.getItem(notificationSyncKey(workspaceType));
  const url =
    `${API_BASE}/notifications/sync?workspaceType=${workspaceType}` +
    (lastSyncedAt ? `&lastSyncedAt=${lastSyncedAt}` : "");

  try {
    const res = await fetch(url, { headers: authHeaders(token) });
    if (!res.ok) return false;

    const { notifications, syncedAt }: { notifications: any[]; syncedAt: number } =
      await res.json();

    if (notifications.length > 0) {
      await mergeNotificationsFromServer(
        notifications.map((n) => ({
          ...n,
          userEmail,
          workspaceType,
          syncStatus: "synced",
        }))
      );
    }

    localStorage.setItem(notificationSyncKey(workspaceType), String(syncedAt));
    return notifications.length > 0;
  } catch {
    return false;
  }
}

// ─── Merge sections into IDB ──────────────────────────────────────────────────
async function mergeSections(
  serverSections: any[],
  userEmail:      string,
  workspaceType:  string,
  workspaceId?:   string   // set for collab sections
): Promise<void> {
  const db           = await initDB();
  const tx           = db.transaction(["sections", "tasks"], "readwrite");
  const sectionStore = tx.objectStore("sections");
  const taskStore    = tx.objectStore("tasks");

  for (const section of serverSections) {
    if (section.deleted) {
      await sectionStore.delete(section.id);
      // Clean up orphaned tasks eagerly
      const all = await taskStore.getAll();
      for (const t of all) {
        if (t.sectionId === section.id) await taskStore.delete(t.id);
      }
      continue;
    }

    const existing = await sectionStore.get(section.id);
    await sectionStore.put({
      ...section,
      userEmail,
      workspaceType,
      workspaceId: workspaceId ?? existing?.workspaceId ?? section.workspaceId ?? null,
    });
  }

  await tx.done;
}

// ─── Merge tasks into IDB ─────────────────────────────────────────────────────
async function mergeTasks(
  serverTasks:   any[],
  userEmail:     string,
  workspaceType: string,
  workspaceId?:  string   // set for collab — saved so byWorkspaceId index works
): Promise<void> {
  const db    = await initDB();
  const tx    = db.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");

  // sync.ts — mergeTasks (replace the inner loop body)
for (const task of serverTasks) {
  if (task.deleted) {
    await store.delete(task.id);
    continue;
  }

  const existing   = await store.get(task.id);
  // Fix: also treat pending (unconfirmed creates) as locally newer
  const localNewer = existing?.dirty && existing.updatedAt > task.updatedAt;

  if (!existing || !localNewer) {
    await store.put({
      ...task,
      subtasks: normalizeSubtasks(task.subtasks),
      userEmail,
      workspaceType,
      // Fix: always set workspaceId for collab — fall back to existing record's
      // value in case the server payload doesn't echo it back
      workspaceId: workspaceId ?? existing?.workspaceId ?? task.workspaceId ?? null,
      dirty:      false,
      syncStatus: "synced",
    });
  }
}

  await tx.done;
}
