import { initDB, STORE_ARCHIVE } from "./idb.init";

export async function getAllArchivedTasks(
  userEmail:      string,
  workspaceType?: string,
  workspaceId?:   string | null
) {
  if (!userEmail) return [];
  const db  = await initDB();
  const all = await db.getAll(STORE_ARCHIVE);
  return all.filter((a) => {
    if (workspaceId)   return a.workspaceId === workspaceId;
    if (workspaceType) return a.userEmail === userEmail && (a.workspaceType || "personal") === workspaceType;
    return a.userEmail === userEmail;
  });
}

export async function saveArchivedToDB(record: object): Promise<void> {
  await (await initDB()).put(STORE_ARCHIVE, record);
}

export async function deleteArchivedFromDB(id: string): Promise<void> {
  if (id) await (await initDB()).delete(STORE_ARCHIVE, id);
}

export async function clearAllArchivedFromDB(
  userEmail:      string,
  workspaceType?: string,
  workspaceId?:   string | null
): Promise<void> {
  const all = await getAllArchivedTasks(userEmail, workspaceType, workspaceId);
  const db  = await initDB();
  for (const r of all) await db.delete(STORE_ARCHIVE, r.id);
}