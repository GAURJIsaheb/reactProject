
// Core hook for archive/restore logic
// Offline-first: IndexDB first, then sync to MongoDB

import { useState, useCallback } from "react";
import { useAuthStore } from "@/zustand/authStore";
import type { Task } from "@/shared/types/task";
import { deleteLocalTask, saveLocalTask } from "@/hooks/indexdbLayer"; 

import { encryptTask, decryptTask } from "./archiveService";
import {
  getAllArchivedTasks,
  saveArchivedToDB,
  deleteArchivedFromDB,
} from "@/infrastructure/lib/idb";

export interface ArchivedTask {
  id: string;
  userEmail: string;
  workspaceType: string;
  archived: true;
  encrypted: true;
  encryptedPayload: { iv: number[]; payload: number[] };
  archivedAt: number;
}

import {
  apiArchiveTasks,
  apiRestoreTask,
  apiRestoreAllTasks,
} from "../services/archive.service";

export function useArchiveEngine(onTasksChanged: () => Promise<void>) {
  const { userEmail, token } = useAuthStore();

  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>([]);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100

  // Load archived tasks from IndexDB
  const loadArchived = useCallback(async () => {
    if (!userEmail) return;
    const data = await getAllArchivedTasks(userEmail);
    setArchivedTasks(data);
  }, [userEmail]);

  // Archive selected tasks (single or multiple)
  const archiveTasks = useCallback(
    async (tasks: Task[]) => {
      if (!userEmail || tasks.length === 0) return;
      setIsArchiving(true);
      setProgress(0);

      const total = tasks.length;
      const archiveRecords: ArchivedTask[] = [];
      const serverPayloads = [];

      for (let i = 0; i < total; i++) {
        const task = tasks[i];

        // image encrption of indexDb (for local restore )
        const idbPayload = await encryptTask({
          id: task.id,
          text: task.text,
          completed: task.completed,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          userEmail: task.userEmail,
          workspaceType: task.workspaceType,
          image: task.image,
          sectionId: task.sectionId ?? null, 
        });

        const serverPayload = await encryptTask({
          id: task.id,
          text: task.text,
          completed: task.completed,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          userEmail: task.userEmail,
          workspaceType: task.workspaceType,
        });

        const archiveRecord: ArchivedTask = {
          id: task.id,
          userEmail,
          workspaceType: task.workspaceType,
          archived: true,
          encrypted: true,
          encryptedPayload: idbPayload, 
          archivedAt: Date.now(),
        };

        // Save to IndexDB archive store
        await saveArchivedToDB(archiveRecord);

        // Remove from tasks IndexDB store
        await deleteLocalTask(task.id);

        archiveRecords.push(archiveRecord);
        serverPayloads.push({
          id: task.id,
          userEmail,
          workspaceType: task.workspaceType,
          encryptedPayload: serverPayload, 
          archivedAt: archiveRecord.archivedAt,
        });

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      setArchivedTasks((prev) => [...prev, ...archiveRecords]);

      // Refresh dashboard tasks
      await onTasksChanged();

      // Sync to MongoDB 
      if (token) {
        try {
          await apiArchiveTasks(serverPayloads, token);
        } catch {
          console.log("archive: offline, will sync later");
        }
      }

      setIsArchiving(false);
      setProgress(0);
    },
    [userEmail, token, onTasksChanged]
  );

  // Restore specific archived tasks
  const restoreTasks = useCallback(
    async (archivedIds: string[]) => {
      if (!userEmail || archivedIds.length === 0) return;
      setIsRestoring(true);
      setProgress(0);

      const all = await getAllArchivedTasks(userEmail);
      const toRestore = all.filter((a) => archivedIds.includes(a.id));
      const total = toRestore.length;

      for (let i = 0; i < total; i++) {
        const record = toRestore[i];

        // Decrypt
        const plain = await decryptTask<{
          id: string;
          text: string;
          completed: boolean;
          createdAt: number;
          updatedAt: number;
          userEmail: string;
          workspaceType: string;
          image: string | null;
          sectionId: string | null;
        }>(record.encryptedPayload);

        // Restore to tasks IndexDB store
        await saveLocalTask({
          ...plain,
          sectionId: plain.sectionId ?? null,
          archived: false,
          deleted: false,
          deletedAt:  null,   
          syncStatus: "pending",
        });

        // Remove from archive IndexDB store
        await deleteArchivedFromDB(record.id);

        // Soft delete on MongoDB 
        if (token) {
          try {
            await apiRestoreTask(record.id, token);
          } catch {
            console.log("restore: offline, will sync later");
          }
        }

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      await loadArchived();
      await onTasksChanged();

      setIsRestoring(false);
      setProgress(0);
    },
    [userEmail, token, loadArchived, onTasksChanged]
  );

  // Restore ALL archived tasks
  const restoreAllTasks = useCallback(async () => {
    if (!userEmail) return;
    const all = await getAllArchivedTasks(userEmail);
    const ids = all.map((a) => a.id);

    await restoreTasks(ids);

    // Bulk restore on server
    if (token) {
      try {
        await apiRestoreAllTasks(token);
      } catch {
        console.log("restore-all: offline, will sync later");
      }
    }
  }, [userEmail, token, restoreTasks]);

  return {
    archivedTasks,
    archivedCount: archivedTasks.length,
    isArchiving,
    isRestoring,
    progress,
    archiveTasks,
    restoreTasks,
    restoreAllTasks,
    loadArchived,
  };
}