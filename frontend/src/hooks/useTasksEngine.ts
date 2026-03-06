import { useEffect, useState, useCallback } from "react";
import { initDB } from "@/infrastructure/lib/idb";
import { useAuthStore } from "@/zustand/authStore";
import type { Task } from "@/shared/types/task";
import { processQueue } from "@/infrastructure/queue/syncQueue";

import {
  loadLocalTasks,
  getLocalTask,
  saveLocalTask,
  deleteLocalTask,
} from "./indexdbLayer";

import {
  queueCreate,
  queueUpdate,
  queueDelete,
  removeQueueJob,
} from "./taskQueueOps";

import {
  apiCreateTask,
  apiUpdateTask,
  apiDeleteTask,
  fetchFromServer,
} from "../services/task.service";

export function useTasksEngine() {
  const { userEmail, token } = useAuthStore();

  const [tasks, setTasks] = useState<Task[]>([]);

  // Lazy initializer — avoids reading localStorage on every render pass
  const [workspace, setWorkspace] = useState<string>(
    () => localStorage.getItem("workspace") || "personal"
  );

  // ─── Load ─────────────────────────────────────────────────────────────────────

  const reloadTasks = useCallback(async () => {
    if (!userEmail) return;
    const fresh = await loadLocalTasks(userEmail, workspace);
    setTasks(fresh);
  }, [userEmail, workspace]);

  // Single consolidated effect — prevents double loadLocalTasks call on mount
  useEffect(() => {
    if (!userEmail) return;

    const init = async () => {
      await initDB();

      if (token) {
        await fetchFromServer(userEmail, workspace, token);
      }

      await reloadTasks();
    };

    init();
  }, [token, userEmail, workspace]);

  // Sync when network comes back online
  useEffect(() => {
    const handleOnline = async () => {
      if (token) {
        await processQueue(token);
        await reloadTasks();
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [token, reloadTasks]);

  // ─── Create ───────────────────────────────────────────────────────────────────

  async function createTask(
  text: string,
  imageFile?: File | null,
  sectionId?: string | null
) {
  if (!userEmail) throw new Error("User not authenticated");

  const task: Task = {
    id: crypto.randomUUID(),
    text,
    completed: false,
    archived: false,
    deleted: false,
    deletedAt: null,
    image: null,
    sectionId: sectionId ?? null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    userEmail,
    workspaceType: workspace,
    syncStatus: "pending",
    version: 1,
  };

  // Pehle IDB + UI update
  await saveLocalTask(task);
  setTasks((prev) => [...prev, task]);

  if (!token) {
    // Offline — queue mein daalo
    const jobId = crypto.randomUUID();
    await queueCreate(task, userEmail, workspace, jobId);
    return task;
  }

  // Online — seedha API call, queue mat karo abhi
  try {
    const result = await apiCreateTask(task, token, imageFile);

    const syncedTask: Task = {
      ...task,
      syncStatus: "synced",
      image: result?.task?.imageUrl ?? result?.task?.image ?? null,
    };

    await saveLocalTask(syncedTask);
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? syncedTask : t))
    );
    return syncedTask;
  } catch {
    // Failed — ab queue mein daalo retry ke liye
    const jobId = crypto.randomUUID();
    await queueCreate(task, userEmail, workspace, jobId);
    return task;
  }
}
  // ─── Toggle Complete ──────────────────────────────────────────────────────────

  async function toggleComplete(id: string) {
    if (!userEmail) return;

    const task = await getLocalTask(id);
    if (!task) return;

    const updated: Task = {
      ...task,
      completed: !task.completed,
      updatedAt: Date.now(),
      syncStatus: "pending",
      version: (task.version ?? 1) + 1,
    };

    await saveLocalTask(updated);

    const jobId = crypto.randomUUID();
    await queueUpdate(jobId, id, userEmail, {
      completed: updated.completed,
      version: updated.version,
    });

    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));

    if (!token) return;

    try {
      await apiUpdateTask(
        id,
        { completed: updated.completed, version: updated.version },
        token
      );
      await saveLocalTask({ ...updated, syncStatus: "synced" });
      await removeQueueJob(jobId);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, syncStatus: "synced" } : t))
      );
    } catch {
      // Offline — queued for retry
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────────

  async function deleteTask(id: string) {
    if (!userEmail) return;

    await deleteLocalTask(id);

    // Capture jobId so we can clean it up after a successful API call,
    // preventing a spurious 404 retry from syncQueue
    const jobId = await queueDelete(id, userEmail, workspace);

    setTasks((prev) => prev.filter((t) => t.id !== id));

    if (!token) return;

    try {
      await apiDeleteTask(id, token);
      await removeQueueJob(jobId);
    } catch {
      // Offline — queued for retry
    }
  }

  // ─── Edit ─────────────────────────────────────────────────────────────────────

  async function editTask(id: string, newText: string, newImage?: string | null) {
    if (!userEmail) return;

    const task = await getLocalTask(id);
    if (!task) return;

    const updated: Task = {
      ...task,
      text: newText,
      image: newImage !== undefined ? newImage : task.image,
      updatedAt: Date.now(),
      syncStatus: "pending",
      version: (task.version ?? 1) + 1,
    };

    await saveLocalTask(updated);

    const jobId = crypto.randomUUID();
    await queueUpdate(jobId, id, userEmail, {
      text: updated.text,
      image: updated.image,
      version: updated.version,
    });

    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));

    if (!token) return;

    try {
      await apiUpdateTask(
        id,
        { text: updated.text, image: updated.image, version: updated.version },
        token
      );
      await saveLocalTask({ ...updated, syncStatus: "synced" });
      await removeQueueJob(jobId);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, syncStatus: "synced" } : t))
      );
    } catch {
      // Offline — queued for retry
    }
  }

  // ─── Move to Section ──────────────────────────────────────────────────────────

  async function moveTaskToSection(id: string, sectionId: string | null) {
    if (!userEmail) return;

    const task = await getLocalTask(id);
    if (!task) return;

    const updated: Task = {
      ...task,
      sectionId,
      updatedAt: Date.now(),
      syncStatus: "pending",
      version: (task.version ?? 1) + 1,
    };

    await saveLocalTask(updated);

    const jobId = crypto.randomUUID();
    await queueUpdate(jobId, id, userEmail, {
      sectionId,
      version: updated.version,
    });

    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));

    if (!token) return;

    try {
      await apiUpdateTask(id, { sectionId, version: updated.version }, token);
      await saveLocalTask({ ...updated, syncStatus: "synced" });
      await removeQueueJob(jobId);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, syncStatus: "synced" } : t))
      );
    } catch {
      // Offline — queued for retry
    }
  }

  return {
    tasks,
    workspace,
    setWorkspace,
    createTask,
    toggleComplete,
    deleteTask,
    editTask,
    moveTaskToSection,
    reloadTasks,
  };
}
