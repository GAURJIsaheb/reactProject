// IndexedDB operations for archived tasks
// Uses the unified "MyTodoApp" DB from idb.ts — no separate DB

import {
  saveArchivedToDB,
  getAllArchivedTasks as idbGetAll,
  deleteArchivedFromDB,
  clearAllArchivedFromDB,
} from "@/lib/idb";

import type { EncryptedPayload } from "./archiveService";

export interface ArchivedTask {
  id: string;
  userEmail: string;
  workspaceType: string;
  archived: true;
  encrypted: true;
  encryptedPayload: EncryptedPayload;
  archivedAt: number;
}

export async function saveArchivedTask(task: ArchivedTask): Promise<void> {
  await saveArchivedToDB(task);
}

export async function getAllArchivedTasks(userEmail: string): Promise<ArchivedTask[]> {
  const all = await idbGetAll(userEmail);
  return all as ArchivedTask[];
}

export async function deleteArchivedTask(id: string): Promise<void> {
  await deleteArchivedFromDB(id);
}

export async function clearAllArchivedTasks(userEmail: string): Promise<void> {
  await clearAllArchivedFromDB(userEmail);
}