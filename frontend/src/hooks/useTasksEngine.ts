import { useEffect, useState, useCallback } from "react";
import { initDB } from "@/lib/idb";
import { useAuthStore } from "@/zustand/authStore";
import type { Task } from "@/types/task";
import { processQueue } from "@/queue/syncQueue";

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
} from "../api/taskApi";

export function useTasksEngine() {
  const { userEmail, token } = useAuthStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspace, setWorkspace] = useState(
    localStorage.getItem("workspace") || "personal"
  );

  // ─── Load ─────────────────────────────────────────────────────────────────────

  const loadTasks = useCallback(async () => {
    if (!userEmail) return;
    await initDB();
    const data = await loadLocalTasks(userEmail, workspace);
    setTasks(data);
  }, [userEmail, workspace]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

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
  }, [token]);

  // Initial server sync on mount / workspace change
  useEffect(() => {
    if (!token || !userEmail) return;
    const sync = async () => {
      await fetchFromServer(userEmail, workspace, token);
      await loadTasks();
    };
    sync();
  }, [token, userEmail, workspace]);

  const reloadTasks = useCallback(async () => {
    if (!userEmail) return;
    const fresh = await loadLocalTasks(userEmail, workspace);
    setTasks(fresh);
  }, [userEmail, workspace]);

  // ─── Create ───────────────────────────────────────────────────────────────────

  async function createTask(
    text: string,
    image?: string | null,
    sectionId?: string | null  // which kanban column this task belongs to
  ) {
    if (!userEmail) throw new Error("User not authenticated");

    const task: Task = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      archived: false,
      deleted: false,
      image: image || null,
      sectionId: sectionId ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userEmail,
      workspaceType: workspace,
      syncStatus: "pending",
    };

    await saveLocalTask(task);

    const jobId = crypto.randomUUID();
    await queueCreate(task, userEmail, workspace, jobId);

    setTasks((prev) => [...prev, task]);

    if (!token) return;

    try {
      await apiCreateTask(task, token);
      await removeQueueJob(jobId);
      await saveLocalTask({ ...task, syncStatus: "synced" });
      // Update local state to reflect synced status
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, syncStatus: "synced" } : t))
      );
    } catch {
      // Offline — will be retried by syncQueue
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
    };

    await saveLocalTask(updated);

    const jobId = crypto.randomUUID();
    await queueUpdate(jobId, id, userEmail, { completed: updated.completed });

    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));

    if (!token) return;

    try {
      await apiUpdateTask(id, { completed: updated.completed }, token);
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
    await queueDelete(id, userEmail, workspace);

    setTasks((prev) => prev.filter((t) => t.id !== id));

    if (!token) return;

    try {
      await apiDeleteTask(id, token);
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
    };

    await saveLocalTask(updated);

    const jobId = crypto.randomUUID();
    await queueUpdate(jobId, id, userEmail, {
      text: updated.text,
      image: updated.image,
    });

    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));

    if (!token) return;

    try {
      await apiUpdateTask(id, { text: updated.text, image: updated.image }, token);
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
  // Called by KanbanBoard when a task is dragged between columns

  async function moveTaskToSection(id: string, sectionId: string | null) {
    if (!userEmail) return;

    const task = await getLocalTask(id);
    if (!task) return;

    const updated: Task = {
      ...task,
      sectionId,
      updatedAt: Date.now(),
      syncStatus: "pending",
    };

    await saveLocalTask(updated);

    const jobId = crypto.randomUUID();
    await queueUpdate(jobId, id, userEmail, { sectionId });

    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));

    if (!token) return;

    try {
      await apiUpdateTask(id, { sectionId }, token);
      await saveLocalTask({ ...updated, syncStatus: "synced" });
      await removeQueueJob(jobId);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, syncStatus: "synced" } : t))
      );
    } catch (error) {
        const isOffline = !navigator.onLine;
        if (!isOffline) {
          // Online but server error — log for debugging
          console.error("Server error during task create:", error);
        }
        // Either way, task is safe in IDB with syncStatus: "pending"
        // syncQueue will handle the retry
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
    loadTasks,
    reloadTasks,
  };
}