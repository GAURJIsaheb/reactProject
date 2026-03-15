//pullTasks, mergeTasks
import { initDB }                        from "@/infrastructure/indexDb/idb";
import { pruneSyncedTasksMissingOnServer } from "@/infrastructure/indexDb/idb";
import { normalizeSubtasks }             from "@/shared/lib/subtasks";
import { API_BASE }                      from "./sync.config";
import { taskSyncKey }                   from "./sync.timestamps";
import { pullWorkspaceResource }         from "./sync.pull";

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
    if (task.deleted) {
      await store.delete(task.id);
      continue;
    }

    const existing   = await store.get(task.id);
    const localNewer = existing?.dirty && existing.updatedAt > task.updatedAt;

    if (!existing || !localNewer) {
      await store.put({
        ...task,
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