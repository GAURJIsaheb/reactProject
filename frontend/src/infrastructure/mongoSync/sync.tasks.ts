//pullTasks, mergeTasks
import { initDB }                        from "@/infrastructure/indexDb/idb";
import { pruneSyncedTasksMissingOnServer } from "@/infrastructure/indexDb/idb";
import { normalizeSubtasks }             from "@/shared/lib/subtasks";
import { API_BASE }                      from "./sync.config";
import { taskSyncKey }                   from "./sync.timestamps";
import { pullWorkspaceResource }         from "./sync.pull";

//with pagination
export async function pullTasks(
  workspaceId:   string,
  workspaceType: string,
  token:         string,
  userEmail:     string,
  isCollab:      boolean
): Promise<boolean> {
  const syncKey      = taskSyncKey(workspaceId);
  const lastSyncedAt = localStorage.getItem(syncKey);
  const deltaParam   = lastSyncedAt ? `&lastSyncedAt=${lastSyncedAt}` : "";
  const currentParams = new URLSearchParams({ workspaceType });
  if (workspaceId) currentParams.set("workspaceId", workspaceId);

  // ─── Delta sync (unchanged) ───────────────────────────────────────────────
  if (lastSyncedAt) {
    return pullWorkspaceResource({
      syncKey,
      deltaUrl:   `${API_BASE}/tasks/sync?workspaceId=${workspaceId}${deltaParam}`,
      currentUrl: `${API_BASE}/tasks?${currentParams.toString()}`,
      token,
      readDelta:  (data) => ({ items: data.tasks ?? [], syncedAt: data.syncedAt ?? Date.now() }),
      mergeItems: (items) =>
        mergeTasks(items as any[], userEmail, workspaceType, isCollab ? workspaceId : undefined),
      pruneItems: (items) =>
        pruneSyncedTasksMissingOnServer(
          userEmail,
          workspaceType,
          (items as any[]).map((t: any) => t.taskId ?? t.id).filter(Boolean),
          workspaceId
        ),
    });
  }

  // ─── First load — paginated full fetch ───────────────────────────────────
  const LIMIT    = 50;
  let   page     = 1;
  let   allTasks: any[] = [];

  while (true) {
    const url = `${API_BASE}/tasks?${currentParams.toString()}&page=${page}&limit=${LIMIT}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) break;

    const data = await res.json();
    const tasks      = data.tasks      ?? [];
    const totalPages = data.totalPages ?? 1;

    allTasks = [...allTasks, ...tasks];

    if (page >= totalPages) break;
    page++;
  }

  if (!allTasks.length) return false;

  await mergeTasks(allTasks, userEmail, workspaceType, isCollab ? workspaceId : undefined);
  await pruneSyncedTasksMissingOnServer(
    userEmail,
    workspaceType,
    allTasks.map((t) => t.taskId ?? t.id).filter(Boolean),
    workspaceId
  );

  localStorage.setItem(syncKey, String(Date.now()));
  return true;
}

export async function mergeTasks(
  serverTasks:   any[],
  userEmail:     string,
  workspaceType: string,
  workspaceId?:  string
): Promise<void> {
  const db    = await initDB();
  const tx    = db.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");

  for (const task of serverTasks) {
  const key = task.id ?? task.taskId;
  if (!key) continue;  // ← skip malformed entries instead of crashing

  if (task.deleted) {
    await store.delete(key);
    continue;
  }

  const existing   = await store.get(key);
  const localNewer = existing?.dirty && existing.updatedAt > task.updatedAt;

  if (!existing || !localNewer) {
    await store.put({
      ...task,
      id:          key,   // ← normalize to always have .id
      subtasks:    normalizeSubtasks(task.subtasks),
      userEmail,
      workspaceType,
      workspaceId: workspaceId ?? existing?.workspaceId ?? task.workspaceId ?? null,
      dirty:       false,
      syncStatus:  "synced",
    });
  }
}

  await tx.done;
}