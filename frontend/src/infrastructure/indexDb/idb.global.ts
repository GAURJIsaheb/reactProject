//clearAllUserData, clearWorkspaceDataFromIDB
import {
  initDB,
  STORE_TASKS,
  STORE_USER,
  STORE_SYNC,
  STORE_ARCHIVE,
  STORE_SECTIONS,
  STORE_NOTIFICATIONS,
} from "./idb.init";

export async function clearAllUserData(): Promise<void> {
  const db = await initDB();
  await Promise.all([
    db.clear(STORE_TASKS),
    db.clear(STORE_SYNC),
    db.clear(STORE_USER),
    db.clear(STORE_NOTIFICATIONS),
  ]);
}

export async function clearWorkspaceDataFromIDB(
  userEmail:     string,
  workspaceType: string,
  workspaceId?:  string | null
): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(
    [STORE_TASKS, STORE_SECTIONS, STORE_ARCHIVE, STORE_NOTIFICATIONS, STORE_SYNC],
    "readwrite"
  );

  const [tasks, sections, archives, notifications, queueJobs] = await Promise.all([
    tx.objectStore(STORE_TASKS).getAll(),
    tx.objectStore(STORE_SECTIONS).getAll(),
    tx.objectStore(STORE_ARCHIVE).getAll(),
    tx.objectStore(STORE_NOTIFICATIONS).getAll(),
    tx.objectStore(STORE_SYNC).getAll(),
  ]);

  const matchesWorkspace = (r: { workspaceId?: string | null; workspaceType?: string; userEmail?: string }) =>
    workspaceId
      ? r.workspaceId === workspaceId
      : r.userEmail === userEmail && (r.workspaceType || "personal") === workspaceType;

  for (const t of tasks)
    if (matchesWorkspace(t)) tx.objectStore(STORE_TASKS).delete(t.id);

  for (const s of sections)
    if (matchesWorkspace(s)) tx.objectStore(STORE_SECTIONS).delete(s.id);

  for (const a of archives) {
    const match = workspaceId
      ? a.workspaceId === workspaceId
      : a.userEmail === userEmail && (a.workspaceType || "personal") === workspaceType;
    if (match) tx.objectStore(STORE_ARCHIVE).delete(a.id);
  }

  for (const n of notifications)
    if (n.userEmail === userEmail && n.workspaceType === workspaceType)
      tx.objectStore(STORE_NOTIFICATIONS).delete(n.id);

  for (const j of queueJobs) {
    const match = workspaceId
      ? j.workspaceId === workspaceId
      : j.userEmail === userEmail && j.workspaceType === workspaceType;
    if (match) tx.objectStore(STORE_SYNC).delete(j.id);
  }

  await tx.done;
}