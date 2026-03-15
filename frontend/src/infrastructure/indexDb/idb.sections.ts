import type { Section } from "@/shared/types/section";
import {
  initDB,
  STORE_SECTIONS,
  IDX_SECTIONS_BY_USER_WORKSPACE,
  IDX_SECTIONS_BY_WORKSPACE_ID,
} from "./idb.init";

export async function getAllSections(
  userEmail:     string,
  workspaceType: string,
  workspaceId?:  string | null
): Promise<Section[]> {
  if (!userEmail) return [];
  const db = await initDB();

  if (workspaceId) {
    const all = await db.getAllFromIndex(
      STORE_SECTIONS,
      IDX_SECTIONS_BY_WORKSPACE_ID,
      IDBKeyRange.only(workspaceId)
    );
    return all.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  const all = await db.getAllFromIndex(
    STORE_SECTIONS,
    IDX_SECTIONS_BY_USER_WORKSPACE,
    IDBKeyRange.only([userEmail, workspaceType])
  );
  return all.sort((a, b) => a.order - b.order);
}

export async function upsertSection(section: Section): Promise<void> {
  await (await initDB()).put(STORE_SECTIONS, section);
}

export async function deleteSectionFromIDB(id: string): Promise<void> {
  if (!id) return;
  await (await initDB()).delete(STORE_SECTIONS, id);
}

export async function pruneSyncedSectionsMissingOnServer(
  userEmail:        string,
  workspaceType:    string,
  serverSectionIds: string[],
  workspaceId?:     string | null
): Promise<number> {
  const db    = await initDB();
  const tx    = db.transaction(STORE_SECTIONS, "readwrite");
  const store = tx.objectStore(STORE_SECTIONS);
  const idSet = new Set(serverSectionIds);

  const local: Section[] = workspaceId
    ? await store.index(IDX_SECTIONS_BY_WORKSPACE_ID).getAll(IDBKeyRange.only(workspaceId))
    : await store.index(IDX_SECTIONS_BY_USER_WORKSPACE).getAll([userEmail, workspaceType]);

  let pruned = 0;
  for (const s of local)
    if (!idSet.has(s.id) && !s.dirty) { await store.delete(s.id); pruned++; }

  await tx.done;
  return pruned;
}