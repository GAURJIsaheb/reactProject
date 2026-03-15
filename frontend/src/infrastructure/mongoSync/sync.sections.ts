//pullSections, mergeSections
import { initDB }                          from "@/infrastructure/indexDb/idb";
import { pruneSyncedSectionsMissingOnServer } from "@/infrastructure/indexDb/idb";
import { API_BASE }                        from "./sync.config";
import { sectionSyncKey }                  from "./sync.timestamps";
import { pullWorkspaceResource }           from "./sync.pull";

export async function pullSections(
  workspaceId:   string,
  workspaceType: string,
  token:         string,
  userEmail:     string,
  isCollab:      boolean
): Promise<boolean> {
  const syncKey      = isCollab ? sectionSyncKey(workspaceId) : sectionSyncKey(workspaceType);
  const lastSyncedAt = localStorage.getItem(syncKey);
  const param        = isCollab ? `workspaceId=${workspaceId}` : `workspaceType=${workspaceType}`;
  const deltaParam   = lastSyncedAt ? `&lastSyncedAt=${lastSyncedAt}` : "";
  const currentParams = new URLSearchParams({ workspaceType });
  if (workspaceId) currentParams.set("workspaceId", workspaceId);

  return pullWorkspaceResource({
    syncKey,
    deltaUrl:   `${API_BASE}/sections/sync?${param}${deltaParam}`,
    currentUrl: `${API_BASE}/sections?${currentParams.toString()}`,
    token,
    readDelta:  (data) => ({ items: data.sections ?? [], syncedAt: data.syncedAt ?? Date.now() }),
    mergeItems: (items) =>
      mergeSections(items as any[], userEmail, workspaceType, isCollab ? workspaceId : undefined),
    pruneItems: (items) =>
      pruneSyncedSectionsMissingOnServer(
        userEmail,
        workspaceType,
        (items as any[]).map((s: any) => s.sectionId ?? s.id).filter(Boolean),
        workspaceId
      ),
  });
}

export async function mergeSections(
  serverSections: any[],
  userEmail:      string,
  workspaceType:  string,
  workspaceId?:   string
): Promise<void> {
  const db           = await initDB();
  const tx           = db.transaction(["sections", "tasks"], "readwrite");
  const sectionStore = tx.objectStore("sections");
  const taskStore    = tx.objectStore("tasks");

  for (const section of serverSections) {
    if (section.deleted) {
      await sectionStore.delete(section.id);
      const all = await taskStore.getAll();
      for (const t of all)
        if (t.sectionId === section.id) await taskStore.delete(t.id);
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