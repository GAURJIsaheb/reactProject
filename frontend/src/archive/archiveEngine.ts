import { useState, useCallback } from "react";
import { useAuthStore } from "@/zustand/authStore";
import type { Task } from "@/shared/types/task";
import { saveLocalTask } from "@/hooks/indexdbLayer";
import { normalizeSubtasks } from "@/shared/lib/subtasks";

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
  workspaceId?: string | null;
  archived: true;
  encrypted: true;
  encryptedPayload: { iv: number[]; payload: number[] };
  archivedAt: number;
  syncStatus?: "pending" | "synced";
}

import {
  apiArchiveTasks,
  apiFetchArchivedTasks,
  apiRestoreTask,
  apiRestoreAllTasks,
} from "../services/archive.service";

type ArchiveContext = {
  workspaceType: string;
  workspaceId?: string | null;
};

export function useArchiveEngine(
  onTasksChanged: () => Promise<void>,
  context: ArchiveContext
) {
  const { userEmail, token } = useAuthStore();

  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>([]);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [progress, setProgress] = useState(0);

  const loadArchived = useCallback(async () => {
    if (!userEmail) return;

    const localBefore = await getAllArchivedTasks(userEmail, context.workspaceType, context.workspaceId);

    if (token && navigator.onLine) {
      try {
        const serverTasks = await apiFetchArchivedTasks(context, token);
        const serverIds = new Set(serverTasks.map((task) => task.id));

        for (const localTask of localBefore) {
          if (localTask.syncStatus === "synced" && !serverIds.has(localTask.id)) {
            await deleteArchivedFromDB(localTask.id);
          }
        }

        for (const serverTask of serverTasks) {
          await saveArchivedToDB({
            ...serverTask,
            userEmail,
            workspaceType: context.workspaceType,
            workspaceId: serverTask.workspaceId ?? context.workspaceId ?? null,
            archived: true,
            encrypted: true,
            syncStatus: "synced",
          });
        }
      } catch {
        /* non-fatal */
      }
    }

    const data = await getAllArchivedTasks(userEmail, context.workspaceType, context.workspaceId);
    setArchivedTasks(
      [...data].sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0))
    );
  }, [userEmail, token, context]);

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
        const encryptedPayload = await encryptTask({
          id: task.id,
          text: task.text,
          labels: task.labels ?? [],
          subtasks: normalizeSubtasks(task.subtasks),
          completed: task.completed,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          userEmail: task.userEmail,
          workspaceType: task.workspaceType,
          workspaceId: task.workspaceId ?? context.workspaceId ?? null,
          image: task.image,
          sectionId: task.sectionId ?? null,
          reminderAt: task.reminderAt ?? null,
          version: task.version,
        });

        const archiveRecord: ArchivedTask = {
          id: task.id,
          userEmail,
          workspaceType: task.workspaceType,
          workspaceId: task.workspaceId ?? context.workspaceId ?? null,
          archived: true,
          encrypted: true,
          encryptedPayload,
          archivedAt: Date.now(),
          syncStatus: "pending",
        };

        await saveArchivedToDB(archiveRecord);
        await saveLocalTask({
          ...task,
          archived: true,
          updatedAt: archiveRecord.archivedAt,
          syncStatus: "pending",
        });

        archiveRecords.push(archiveRecord);
        serverPayloads.push({
          id: task.id,
          userEmail,
          workspaceType: task.workspaceType,
          workspaceId: task.workspaceId ?? context.workspaceId ?? null,
          encryptedPayload,
          archivedAt: archiveRecord.archivedAt,
        });

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      setArchivedTasks((prev) =>
        [...prev, ...archiveRecords].sort((a, b) => b.archivedAt - a.archivedAt)
      );
      await onTasksChanged();

      if (token) {
        try {
          await apiArchiveTasks(serverPayloads, token);
          await Promise.all(
            archiveRecords.map((record) =>
              saveArchivedToDB({ ...record, syncStatus: "synced" })
            )
          );
        } catch {
          console.log("archive: offline, will sync later");
        }
      }

      setIsArchiving(false);
      setProgress(0);
    },
    [userEmail, token, onTasksChanged, context]
  );

  const restoreTasks = useCallback(
    async (archivedIds: string[], syncServer = true) => {
      if (!userEmail || archivedIds.length === 0) return;
      setIsRestoring(true);
      setProgress(0);

      const all = await getAllArchivedTasks(userEmail, context.workspaceType, context.workspaceId);
      const toRestore = all.filter((archive) => archivedIds.includes(archive.id));
      const total = toRestore.length;

      for (let i = 0; i < total; i++) {
        const record = toRestore[i];
        const plain = await decryptTask<{
          id: string;
          text: string;
          labels?: string[];
          subtasks?: Task["subtasks"];
          completed: boolean;
          createdAt: number;
          updatedAt: number;
          userEmail: string;
          workspaceType: string;
          workspaceId?: string | null;
          image: string | null;
          sectionId: string | null;
          reminderAt?: number | null;
          version?: number;
        }>(record.encryptedPayload);

        await saveLocalTask({
          ...plain,
          userEmail: plain.userEmail ?? userEmail,
          workspaceType: plain.workspaceType ?? context.workspaceType,
          workspaceId: plain.workspaceId ?? context.workspaceId ?? null,
          labels: plain.labels ?? [],
          subtasks: normalizeSubtasks(plain.subtasks),
          sectionId: plain.sectionId ?? null,
          archived: false,
          deleted: false,
          deletedAt: null,
          syncStatus: "pending",
          version: plain.version ?? 1,
        });

        await deleteArchivedFromDB(record.id);

        if (syncServer && token) {
          try {
            await apiRestoreTask(record.id, context, token);
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
    [userEmail, token, loadArchived, onTasksChanged, context]
  );

  const restoreAllTasks = useCallback(async () => {
    if (!userEmail) return;
    const all = await getAllArchivedTasks(userEmail, context.workspaceType, context.workspaceId);
    const ids = all.map((archive) => archive.id);

    await restoreTasks(ids, false);

    if (token) {
      try {
        await apiRestoreAllTasks(context, token);
      } catch {
        console.log("restore-all: offline, will sync later");
      }
    }
  }, [userEmail, token, restoreTasks, context]);

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
