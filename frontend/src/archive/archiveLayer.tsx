
// IndexDB operations for archived tasks
// Archived tasks live in a separate "archives" object store

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

const DB_NAME = "taskdb";
const ARCHIVE_STORE = "archives";


async function openArchiveDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Open with a slightly higher version to add archive store if missing
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveArchivedTask(task: ArchivedTask): Promise<void> {
  const db = await openArchiveDB();

  // If archive store doesn't exist, we need to upgrade
  if (!db.objectStoreNames.contains(ARCHIVE_STORE)) {
    db.close();
    await upgradeDBForArchive();
    return saveArchivedTask(task);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ARCHIVE_STORE, "readwrite");
    tx.objectStore(ARCHIVE_STORE).put(task);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getAllArchivedTasks(userEmail: string): Promise<ArchivedTask[]> {
  const db = await openArchiveDB();

  if (!db.objectStoreNames.contains(ARCHIVE_STORE)) {
    db.close();
    return [];
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ARCHIVE_STORE, "readonly");
    const request = tx.objectStore(ARCHIVE_STORE).getAll();
    request.onsuccess = () => {
      db.close();
      resolve(
        (request.result as ArchivedTask[]).filter((t) => t.userEmail === userEmail)
      );
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function deleteArchivedTask(id: string): Promise<void> {
  const db = await openArchiveDB();

  if (!db.objectStoreNames.contains(ARCHIVE_STORE)) {
    db.close();
    return;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ARCHIVE_STORE, "readwrite");
    tx.objectStore(ARCHIVE_STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function clearAllArchivedTasks(userEmail: string): Promise<void> {
  const archived = await getAllArchivedTasks(userEmail);
  await Promise.all(archived.map((t) => deleteArchivedTask(t.id)));
}

// DB upgrade helper - adds archive store to existing DB
async function upgradeDBForArchive(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME);
    req.onsuccess = () => {
      const db = req.result;
      const version = db.version;
      db.close();

      const upgradeReq = indexedDB.open(DB_NAME, version + 1);
      upgradeReq.onupgradeneeded = (e) => {
        const upgradeDb = (e.target as IDBOpenDBRequest).result;
        if (!upgradeDb.objectStoreNames.contains(ARCHIVE_STORE)) {
          upgradeDb.createObjectStore(ARCHIVE_STORE, { keyPath: "id" });
        }
      };
      upgradeReq.onsuccess = () => { upgradeReq.result.close(); resolve(); };
      upgradeReq.onerror = () => reject(upgradeReq.error);
    };
    req.onerror = () => reject(req.error);
  });
}