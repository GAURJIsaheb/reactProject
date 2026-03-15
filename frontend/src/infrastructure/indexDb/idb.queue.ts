import type { QueueJob } from "@/shared/types/queue";
import { initDB, STORE_SYNC } from "./idb.init";

export async function addToQueue(item: QueueJob): Promise<void>  { await (await initDB()).put(STORE_SYNC, item); }
export async function getQueue(): Promise<QueueJob[]>            { return (await initDB()).getAll(STORE_SYNC); }
export async function removeFromQueue(id: string): Promise<void> { await (await initDB()).delete(STORE_SYNC, id); }
export async function updateQueue(item: QueueJob): Promise<void> { await (await initDB()).put(STORE_SYNC, item); }

export async function upsertQueue(job: QueueJob): Promise<void> {
  const db       = await initDB();
  const all      = await db.getAll(STORE_SYNC);
  const existing = all.find((j) => j.taskId === job.taskId && j.action === "update");
  if (existing) { job.id = existing.id; job.retry = existing.retry || 0; }
  job.nextRetry  = Date.now();
  await db.put(STORE_SYNC, job);
}

export async function removeTaskUpdatesFromQueue(taskId: string): Promise<void> {
  const db  = await initDB();
  const all = await db.getAll(STORE_SYNC);
  for (const j of all)
    if (j.taskId === taskId && j.action === "update") await db.delete(STORE_SYNC, j.id);
}

export async function removeTasksFromQueue(taskIds: string[]): Promise<void> {
  if (!taskIds.length) return;
  const db    = await initDB();
  const all   = await db.getAll(STORE_SYNC);
  const idSet = new Set(taskIds);
  for (const j of all)
    if (idSet.has(j.taskId)) await db.delete(STORE_SYNC, j.id);
}