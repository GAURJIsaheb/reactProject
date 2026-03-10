import { openDB } from "idb";
import type { Task } from "@/shared/types/task";
import type { QueueJob } from "@/shared/types/queue";
import type { Section } from "@/shared/types/section";
import type { AppNotification } from "@/shared/types/notification";

const DB_NAME    = "MyTodoApp";
const DB_VERSION = 9;   // bumped: added byWorkspaceId index on tasks for collab

const STORE_TASKS         = "tasks";
const STORE_USER          = "user";
const STORE_SYNC          = "syncQueue";
const STORE_ARCHIVE       = "archives";
const STORE_SECTIONS      = "sections";
const STORE_NOTIFICATIONS = "notifications";

const IDX_TASKS_BY_USER_WORKSPACE_DELETED  = "byUserWorkspaceDeleted";
const IDX_TASKS_BY_WORKSPACE_ID             = "byWorkspaceId";          // collab tasks
const IDX_SECTIONS_BY_USER_WORKSPACE       = "byUserWorkspace";
const IDX_SECTIONS_BY_WORKSPACE_ID         = "byWorkspaceId";   // NEW
const IDX_NOTIFICATIONS_BY_USER_WORKSPACE  = "byUserWorkspace";

export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, _oldVersion, _newVersion, tx) {
      // Tasks
      if (!db.objectStoreNames.contains(STORE_TASKS)) {
        const s = db.createObjectStore(STORE_TASKS, { keyPath: "id" });
        s.createIndex(IDX_TASKS_BY_USER_WORKSPACE_DELETED, ["userEmail", "workspaceType", "deleted"]);
        s.createIndex(IDX_TASKS_BY_WORKSPACE_ID, "workspaceId");
      } else {
        const s = tx.objectStore(STORE_TASKS);
        if (!s.indexNames.contains(IDX_TASKS_BY_USER_WORKSPACE_DELETED))
          s.createIndex(IDX_TASKS_BY_USER_WORKSPACE_DELETED, ["userEmail", "workspaceType", "deleted"]);
        if (!s.indexNames.contains(IDX_TASKS_BY_WORKSPACE_ID))
          s.createIndex(IDX_TASKS_BY_WORKSPACE_ID, "workspaceId"); // upgrade path
      }

      // User
      if (!db.objectStoreNames.contains(STORE_USER))
        db.createObjectStore(STORE_USER, { keyPath: "userId" });

      // Sync queue
      if (!db.objectStoreNames.contains(STORE_SYNC)) {
        const s = db.createObjectStore(STORE_SYNC, { keyPath: "id" });
        s.createIndex("byRetry", "retry");
      }

      // Sections
      if (!db.objectStoreNames.contains(STORE_SECTIONS)) {
        const s = db.createObjectStore(STORE_SECTIONS, { keyPath: "id" });
        s.createIndex("byWorkspace",                  "workspaceType");
        s.createIndex(IDX_SECTIONS_BY_USER_WORKSPACE, ["userEmail", "workspaceType"]);
        s.createIndex(IDX_SECTIONS_BY_WORKSPACE_ID,   "workspaceId");   // NEW
      } else {
        const s = tx.objectStore(STORE_SECTIONS);
        if (!s.indexNames.contains(IDX_SECTIONS_BY_USER_WORKSPACE))
          s.createIndex(IDX_SECTIONS_BY_USER_WORKSPACE, ["userEmail", "workspaceType"]);
        if (!s.indexNames.contains(IDX_SECTIONS_BY_WORKSPACE_ID))
          s.createIndex(IDX_SECTIONS_BY_WORKSPACE_ID, "workspaceId");  // upgrade path
      }

      // Archive
      if (!db.objectStoreNames.contains(STORE_ARCHIVE))
        db.createObjectStore(STORE_ARCHIVE, { keyPath: "id" });

      // Notifications
      if (!db.objectStoreNames.contains(STORE_NOTIFICATIONS)) {
        const n = db.createObjectStore(STORE_NOTIFICATIONS, { keyPath: "id" });
        n.createIndex("byWorkspace",                     "workspaceType");
        n.createIndex(IDX_NOTIFICATIONS_BY_USER_WORKSPACE, ["userEmail", "workspaceType"]);
      } else {
        const n = tx.objectStore(STORE_NOTIFICATIONS);
        if (!n.indexNames.contains(IDX_NOTIFICATIONS_BY_USER_WORKSPACE))
          n.createIndex(IDX_NOTIFICATIONS_BY_USER_WORKSPACE, ["userEmail", "workspaceType"]);
      }
    },
  });
}

// Tasks
export const addTask = async (task: Partial<Task>): Promise<void> => {
  if (!task?.id) return;
  const db       = await initDB();
  const existing = await db.get(STORE_TASKS, task.id);
  await db.put(STORE_TASKS, {
    ...existing, ...task,
    workspaceType: task.workspaceType ?? existing?.workspaceType ?? "personal",
    image: task.image !== undefined ? task.image : existing?.image,
  });
};

/**
 * Personal workspaces  → filter by [userEmail, workspaceType]
 * Collab workspaces    → filter by workspaceId (server UUID) so ALL members'
 *                        tasks are visible regardless of their local slug
 */
export const getAllTasks = async (
  userEmail:     string,
  workspaceType: string,
  workspaceId?:  string | null
): Promise<Task[]> => {
  if (!userEmail) return [];
  const db  = await initDB();

  if (workspaceId) {
    // Collab path: fetch by server workspaceId, ignore workspaceType slug
    const all = await db.getAllFromIndex(
      STORE_TASKS,
      IDX_TASKS_BY_WORKSPACE_ID,
      IDBKeyRange.only(workspaceId)
    );
    return all.filter((t) => !t.deleted);
  }

  // Personal path: unchanged
  const all = await db.getAll(STORE_TASKS);
  return all.filter(
    (t) => t.userEmail === userEmail && (t.workspaceType || "personal") === workspaceType && !t.deleted
  );
};

export async function pruneSyncedTasksMissingOnServer(
  userEmail: string, workspaceType: string, serverTaskIds: string[]
): Promise<void> {
  if (!userEmail) return;
  const db    = await initDB();
  const all   = await db.getAll(STORE_TASKS);
  const ids   = new Set(serverTaskIds);
  const stale = all.filter(
    (t) => t.userEmail === userEmail &&
           (t.workspaceType || "personal") === workspaceType &&
           t.syncStatus === "synced" && !ids.has(t.id)
  );
  if (!stale.length) return;
  const tx = db.transaction(STORE_TASKS, "readwrite");
  for (const t of stale) tx.store.delete(t.id);
  await tx.done;
}

export async function getTaskById(id: string): Promise<Task | null> {
  if (!id) return null;
  return (await initDB()).get("tasks", id);
}

export const deleteTaskFromIDB = async (id: string): Promise<void> => {
  if (!id) return;
  const db = await initDB();
  const tx = db.transaction(STORE_TASKS, "readwrite");
  tx.store.delete(id);
  await tx.done;
};

export async function deleteTasksBySectionFromIDB(sectionId: string): Promise<string[]> {
  if (!sectionId) return [];
  const db   = await initDB();
  const all  = await db.getAll(STORE_TASKS);
  const mine = all.filter((t) => t.sectionId === sectionId);
  const tx   = db.transaction(STORE_TASKS, "readwrite");
  for (const t of mine) tx.store.delete(t.id);
  await tx.done;
  return mine.map((t) => t.id);
}

export async function updateTaskSectionInIDB(taskId: string, sectionId: string | null): Promise<void> {
  const db   = await initDB();
  const task = await db.get(STORE_TASKS, taskId);
  if (!task) return;
  await db.put(STORE_TASKS, { ...task, sectionId, updatedAt: Date.now(), dirty: true });
}

// Archive
export async function getAllArchivedTasks(userEmail: string) {
  if (!userEmail) return [];
  const db  = await initDB();
  const all = await db.getAll(STORE_ARCHIVE);
  return all.filter((a) => a.userEmail === userEmail);
}
export async function saveArchivedToDB(record: object)       { await (await initDB()).put(STORE_ARCHIVE, record); }
export async function deleteArchivedFromDB(id: string)       { if (id) await (await initDB()).delete(STORE_ARCHIVE, id); }
export async function clearAllArchivedFromDB(userEmail: string) {
  const all = await getAllArchivedTasks(userEmail);
  const db  = await initDB();
  for (const r of all) await db.delete(STORE_ARCHIVE, r.id);
}

// User
export const saveUser = async (u: { userId: string; email: string; name: string; lastLoginAt: number }) => {
  await (await initDB()).put(STORE_USER, u);
};
export const getUser = async (email: string): Promise<{ email: string; name: string } | null> => {
  if (!email) return null;
  return (await initDB()).get(STORE_USER, email);
};

// Queue
export async function addToQueue(item: QueueJob)   { await (await initDB()).put("syncQueue", item); }
export async function getQueue()                    { return (await initDB()).getAll("syncQueue"); }
export async function removeFromQueue(id: string)  { await (await initDB()).delete("syncQueue", id); }
export async function updateQueue(item: QueueJob)  { await (await initDB()).put(STORE_SYNC, item); }

export async function clearAllUserData() {
  const db = await initDB();
  await db.clear("tasks");
  await db.clear("syncQueue");
  await db.clear("user");
  await db.clear(STORE_NOTIFICATIONS);
}

export async function upsertQueue(job: QueueJob): Promise<void> {
  const db       = await initDB();
  const all      = await db.getAll("syncQueue");
  const existing = all.find((j) => j.taskId === job.taskId && j.action === "update");
  if (existing) { job.id = existing.id; job.retry = existing.retry || 0; }
  job.nextRetry  = Date.now();
  await db.put("syncQueue", job);
}

export async function removeTaskUpdatesFromQueue(taskId: string): Promise<void> {
  const db  = await initDB();
  const all = await db.getAll("syncQueue");
  for (const j of all)
    if (j.taskId === taskId && j.action === "update") await db.delete("syncQueue", j.id);
}

export async function removeTasksFromQueue(taskIds: string[]): Promise<void> {
  if (!taskIds.length) return;
  const db    = await initDB();
  const all   = await db.getAll("syncQueue");
  const idSet = new Set(taskIds);
  for (const j of all)
    if (idSet.has(j.taskId)) await db.delete("syncQueue", j.id);
}

// ── Sections ──────────────────────────────────────────────────────────────────
/**
 * Personal workspaces  → query by [userEmail, workspaceType]
 * Collab workspaces    → query by workspaceId so receiver sees sections
 *                        regardless of their local workspaceType slug
 */
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
): Promise<void> {
  const db    = await initDB();
  const tx    = db.transaction("sections", "readwrite");
  const store = tx.objectStore("sections");
  const idSet = new Set(serverSectionIds);

  const local: Section[] = workspaceId
    ? await store.index(IDX_SECTIONS_BY_WORKSPACE_ID).getAll(IDBKeyRange.only(workspaceId))
    : await store.index(IDX_SECTIONS_BY_USER_WORKSPACE).getAll([userEmail, workspaceType]);

  for (const s of local)
    if (!idSet.has(s.id) && !s.dirty) await store.delete(s.id);

  await tx.done;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export async function upsertNotification(n: AppNotification): Promise<void> {
  await (await initDB()).put(STORE_NOTIFICATIONS, n);
}

export async function getAllNotifications(userEmail: string, workspaceType: string): Promise<AppNotification[]> {
  if (!userEmail) return [];
  const db  = await initDB();
  const all = await db.getAllFromIndex(
    STORE_NOTIFICATIONS,
    IDX_NOTIFICATIONS_BY_USER_WORKSPACE,
    IDBKeyRange.only([userEmail, workspaceType])
  );
  return all.filter((n) => !n.deleted).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function softDeleteNotificationInIDB(id: string): Promise<void> {
  if (!id) return;
  const db = await initDB();
  const e  = await db.get(STORE_NOTIFICATIONS, id);
  if (!e) return;
  await db.put(STORE_NOTIFICATIONS, { ...e, deleted: true, deletedAt: Date.now(), updatedAt: Date.now(), syncStatus: "pending" });
}

export async function getNotificationById(id: string): Promise<AppNotification | null> {
  if (!id) return null;
  return (await initDB()).get(STORE_NOTIFICATIONS, id);
}

export async function markAllNotificationsReadInIDB(userEmail: string, workspaceType: string): Promise<void> {
  const db  = await initDB();
  const all = await db.getAll(STORE_NOTIFICATIONS);
  const tx  = db.transaction(STORE_NOTIFICATIONS, "readwrite");
  for (const n of all)
    if (n.userEmail === userEmail && n.workspaceType === workspaceType && !n.deleted && !n.read)
      tx.store.put({ ...n, read: true, updatedAt: Date.now() });
  await tx.done;
}

export async function mergeNotificationsFromServer(serverNotifications: AppNotification[]): Promise<void> {
  if (!serverNotifications.length) return;
  const db = await initDB();
  const tx = db.transaction(STORE_NOTIFICATIONS, "readwrite");
  for (const n of serverNotifications) {
    const e          = await tx.store.get(n.id);
    const localNewer = e?.syncStatus === "pending" && e.updatedAt > n.updatedAt;
    if (!localNewer) tx.store.put({ ...n, syncStatus: "synced" });
  }
  await tx.done;
}