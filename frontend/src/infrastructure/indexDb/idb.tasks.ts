import type { Task } from "@/shared/types/task";
import { initDB, STORE_TASKS, IDX_TASKS_BY_WORKSPACE_ID } from "./idb.init";

export const addTask = async (task: Partial<Task>): Promise<void> => {
  if (!task?.id) return;
  const db       = await initDB();
  const existing = await db.get(STORE_TASKS, task.id);
  await db.put(STORE_TASKS, {
    ...existing,
    ...task,
    workspaceType: task.workspaceType ?? existing?.workspaceType ?? "personal",
    image:         task.image !== undefined ? task.image : existing?.image,
    labels:        Array.isArray(task.labels)   ? task.labels   : (existing?.labels   ?? []),
    subtasks:      Array.isArray(task.subtasks) ? task.subtasks : (existing?.subtasks ?? []),
  });
};

export const getAllTasks = async (
  userEmail:     string,
  workspaceType: string,
  workspaceId?:  string | null
): Promise<Task[]> => {
  if (!userEmail) return [];
  const db = await initDB();

  if (workspaceId) {
    const all = await db.getAllFromIndex(
      STORE_TASKS,
      IDX_TASKS_BY_WORKSPACE_ID,
      IDBKeyRange.only(workspaceId)
    );
    return all.filter((t) => !t.deleted);
  }

  const all = await db.getAll(STORE_TASKS);
  return all.filter(
    (t) =>
      t.userEmail === userEmail &&
      (t.workspaceType || "personal") === workspaceType &&
      !t.deleted
  );
};

export async function getAllTasksForUser(userEmail: string): Promise<Task[]> {
  if (!userEmail) return [];
  const db  = await initDB();
  const all = await db.getAll(STORE_TASKS);
  return all.filter((t) => t.userEmail === userEmail && !t.deleted);
}

export async function getTaskById(id: string): Promise<Task | null> {
  if (!id) return null;
  return (await initDB()).get(STORE_TASKS, id);
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

export async function pruneSyncedTasksMissingOnServer(
  userEmail:     string,
  workspaceType: string,
  serverTaskIds: string[],
  workspaceId?:  string | null
): Promise<number> {
  if (!userEmail) return 0;
  const db    = await initDB();
  const all   = await db.getAll(STORE_TASKS);
  const ids   = new Set(serverTaskIds);
  const stale = all.filter(
    (t) =>
      (workspaceId
        ? t.workspaceId === workspaceId
        : t.userEmail === userEmail && (t.workspaceType || "personal") === workspaceType) &&
      t.syncStatus === "synced" &&
      !ids.has(t.id)
  );
  if (!stale.length) return 0;
  const tx = db.transaction(STORE_TASKS, "readwrite");
  for (const t of stale) tx.store.delete(t.id);
  await tx.done;
  return stale.length;
}