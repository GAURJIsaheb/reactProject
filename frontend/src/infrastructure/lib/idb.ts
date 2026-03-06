import { openDB } from "idb";
import type { Task } from "@/shared/types/task";
import type { QueueJob } from "@/shared/types/queue";
import type { Section } from "@/shared/types/section";
import type { AppNotification } from "@/shared/types/notification";

const DB_NAME = "MyTodoApp";
const DB_VERSION = 6;

const STORE_TASKS = "tasks";
const STORE_USER = "user";
const STORE_SYNC = "syncQueue";
const STORE_ARCHIVE = "archives";
const STORE_SECTIONS = "sections";
const STORE_NOTIFICATIONS = "notifications";

export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_TASKS)) {
        db.createObjectStore(STORE_TASKS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_USER)) {
        db.createObjectStore(STORE_USER, { keyPath: "userId" });
      }
      if (!db.objectStoreNames.contains(STORE_SYNC)) {
        const store = db.createObjectStore(STORE_SYNC, { keyPath: "id" });
        store.createIndex("byRetry", "retry");
      }
      if (!db.objectStoreNames.contains(STORE_SECTIONS)) {
        const s = db.createObjectStore(STORE_SECTIONS, { keyPath: "id" });
        s.createIndex("byWorkspace", "workspaceType");
      }
      if (!db.objectStoreNames.contains(STORE_ARCHIVE)) {
        db.createObjectStore(STORE_ARCHIVE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_NOTIFICATIONS)) {
        const n = db.createObjectStore(STORE_NOTIFICATIONS, { keyPath: "id" });
        n.createIndex("byWorkspace", "workspaceType");
      }
    },
  });
}

export const addTask = async (task: Partial<Task>): Promise<void> => {
  if (!task?.id) return;
  const db = await initDB();
  const existing = await db.get(STORE_TASKS, task.id);
  const mergedTask = {
    ...existing,
    ...task,
    workspaceType: task.workspaceType ?? existing?.workspaceType ?? "personal",
    image: task.image !== undefined ? task.image : existing?.image,
  };
  await db.put(STORE_TASKS, mergedTask);
};

export const getAllTasks = async (
  userEmail: string,
  workspaceType: string
): Promise<Task[]> => {
  if (!userEmail) return [];
  const db = await initDB();
  const allTasks = await db.getAll(STORE_TASKS);
  return allTasks.filter(
    (t) =>
      t.userEmail === userEmail &&
      (t.workspaceType || "personal") === workspaceType &&
      !t.deleted
  );
};

// Reconcile local synced snapshot with server truth for one workspace.
// We only prune synced records so pending offline tasks are not lost.
export async function pruneSyncedTasksMissingOnServer(
  userEmail: string,
  workspaceType: string,
  serverTaskIds: string[]
): Promise<void> {
  if (!userEmail) return;
  const db = await initDB();
  const allTasks = await db.getAll(STORE_TASKS);
  const serverIds = new Set(serverTaskIds);

  const stale = allTasks.filter(
    (t) =>
      t.userEmail === userEmail &&
      (t.workspaceType || "personal") === workspaceType &&
      t.syncStatus === "synced" &&
      !serverIds.has(t.id)
  );

  if (stale.length === 0) return;

  const tx = db.transaction(STORE_TASKS, "readwrite");
  for (const task of stale) {
    tx.store.delete(task.id);
  }
  await tx.done;
}

export async function getAllArchivedTasks(userEmail: string) {
  if (!userEmail) return [];
  const db = await initDB();
  const all = await db.getAll(STORE_ARCHIVE);
  return all.filter((a) => a.userEmail === userEmail);
}

export async function saveArchivedToDB(record: object) {
  const db = await initDB();
  await db.put(STORE_ARCHIVE, record);
}

export async function deleteArchivedFromDB(id: string) {
  if (!id) return;
  const db = await initDB();
  await db.delete(STORE_ARCHIVE, id);
}

export async function clearAllArchivedFromDB(userEmail: string) {
  const all = await getAllArchivedTasks(userEmail);
  const db = await initDB();
  for (const record of all) {
    await db.delete(STORE_ARCHIVE, record.id);
  }
}

export const saveUser = async (userData: {
  userId: string;
  email: string;
  name: string;
  lastLoginAt: number;
}) => {
  const db = await initDB();
  await db.put(STORE_USER, userData);
};

export const getUser = async (
  email: string
): Promise<{ email: string; name: string } | null> => {
  if (!email) return null;
  const db = await initDB();
  return db.get(STORE_USER, email);
};

export async function getTaskById(id: string): Promise<Task | null> {
  if (!id) return null;
  const db = await initDB();
  return db.get("tasks", id);
}

export const deleteTaskFromIDB = async (id: string): Promise<void> => {
  if (!id) return;
  const db = await initDB();
  const tx = db.transaction(STORE_TASKS, "readwrite");
  tx.store.delete(id);
  await tx.done;
};


// Used when a section is deleted so IDB stays clean (no orphaned tasks).
export async function deleteTasksBySectionFromIDB(sectionId: string): Promise<string[]> {
  if (!sectionId) return [];
  const db = await initDB();
  const all = await db.getAll(STORE_TASKS);
  const sectionTasks = all.filter((t) => t.sectionId === sectionId);

  const tx = db.transaction(STORE_TASKS, "readwrite");
  for (const task of sectionTasks) {
    tx.store.delete(task.id);
  }
  await tx.done;

  // Return deleted task IDs so caller can handle server-side soft-deletes
  return sectionTasks.map((t) => t.id);
}

// Queue helpers
export async function addToQueue(item: QueueJob): Promise<void> {
  const db = await initDB();
  await db.put("syncQueue", item);
}

export async function getQueue() {
  const db = await initDB();
  return db.getAll("syncQueue");
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await initDB();
  return db.delete("syncQueue", id);
}

export async function updateQueue(item: QueueJob): Promise<void> {
  const db = await initDB();
  await db.put(STORE_SYNC, item);
}

export async function clearAllUserData() {
  const db = await initDB();
  await db.clear("tasks");
  await db.clear("syncQueue");
  await db.clear("user");
  await db.clear(STORE_NOTIFICATIONS);
}

export async function upsertQueue(job: QueueJob): Promise<void> {
  const db = await initDB();
  const all = await db.getAll("syncQueue");
  const existing = all.find((j) => j.taskId === job.taskId && j.action === "update");
  if (existing) {
    job.id = existing.id;
    job.retry = existing.retry || 0;
  }
  job.nextRetry = Date.now();
  await db.put("syncQueue", job);
}

// Remove all pending update-jobs for a task (called before deleting it)
export async function removeTaskUpdatesFromQueue(taskId: string): Promise<void> {
  const db = await initDB();
  const all = await db.getAll("syncQueue");
  for (const j of all) {
    if (j.taskId === taskId && j.action === "update") {
      await db.delete("syncQueue", j.id);
    }
  }
}

// ───  Remove ALL queue jobs for a list of task IDs at once ───────────────
export async function removeTasksFromQueue(taskIds: string[]): Promise<void> {
  if (!taskIds.length) return;
  const db = await initDB();
  const all = await db.getAll("syncQueue");
  const idSet = new Set(taskIds);
  for (const j of all) {
    if (idSet.has(j.taskId)) {
      await db.delete("syncQueue", j.id);
    }
  }
}

// Sections
export async function getAllSections(
  userEmail: string,
  workspaceType: string
): Promise<Section[]> {
  if (!userEmail) return [];
  const db = await initDB();
  const all = await db.getAll(STORE_SECTIONS);
  return all
    .filter((s) => s.userEmail === userEmail && s.workspaceType === workspaceType)
    .sort((a, b) => a.order - b.order);
}

export async function upsertSection(section: Section): Promise<void> {
  const db = await initDB();
  await db.put(STORE_SECTIONS, section);
}

export async function deleteSectionFromIDB(id: string): Promise<void> {
  if (!id) return;
  const db = await initDB();
  await db.delete(STORE_SECTIONS, id);
}

export async function updateTaskSectionInIDB(
  taskId: string,
  sectionId: string | null
): Promise<void> {
  const db = await initDB();
  const task = await db.get(STORE_TASKS, taskId);
  if (!task) return;
  await db.put(STORE_TASKS, {
    ...task,
    sectionId,
    updatedAt: Date.now(),
    dirty: true,
  });
}

export async function upsertNotification(notification: AppNotification): Promise<void> {
  const db = await initDB();
  await db.put(STORE_NOTIFICATIONS, notification);
}

export async function getAllNotifications(
  userEmail: string,
  workspaceType: string
): Promise<AppNotification[]> {
  if (!userEmail) return [];
  const db = await initDB();
  const all = await db.getAll(STORE_NOTIFICATIONS);
  return all
    .filter(
      (n) =>
        n.userEmail === userEmail &&
        n.workspaceType === workspaceType &&
        !n.deleted
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function softDeleteNotificationInIDB(id: string): Promise<void> {
  if (!id) return;
  const db = await initDB();
  const existing = await db.get(STORE_NOTIFICATIONS, id);
  if (!existing) return;
  await db.put(STORE_NOTIFICATIONS, {
    ...existing,
    deleted: true,
    deletedAt: Date.now(),
    updatedAt: Date.now(),
    syncStatus: "pending",
  });
}

export async function getNotificationById(id: string): Promise<AppNotification | null> {
  if (!id) return null;
  const db = await initDB();
  return db.get(STORE_NOTIFICATIONS, id);
}

export async function markAllNotificationsReadInIDB(
  userEmail: string,
  workspaceType: string
): Promise<void> {
  const db = await initDB();
  const all = await db.getAll(STORE_NOTIFICATIONS);
  const tx = db.transaction(STORE_NOTIFICATIONS, "readwrite");
  for (const n of all) {
    if (
      n.userEmail === userEmail &&
      n.workspaceType === workspaceType &&
      !n.deleted &&
      !n.read
    ) {
      tx.store.put({ ...n, read: true, updatedAt: Date.now() });
    }
  }
  await tx.done;
}

export async function mergeNotificationsFromServer(
  serverNotifications: AppNotification[]
): Promise<void> {
  if (serverNotifications.length === 0) return;
  const db = await initDB();
  const tx = db.transaction(STORE_NOTIFICATIONS, "readwrite");
  for (const n of serverNotifications) {
    const existing = await tx.store.get(n.id);
    const localIsNewer = existing?.syncStatus === "pending" && existing.updatedAt > n.updatedAt;
    if (!localIsNewer) {
      tx.store.put({ ...n, syncStatus: "synced" });
    }
  }
  await tx.done;
}

//for sync task
