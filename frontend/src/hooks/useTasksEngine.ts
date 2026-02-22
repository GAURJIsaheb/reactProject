import { useEffect, useState, useCallback } from "react";
import { initDB } from "@/lib/idb";
import { useAuthStore } from "@/zustand/authStore";
import type { Task } from "@/types/task";

import {
  loadLocalTasks,
  getLocalTask,
  saveLocalTask,
  deleteLocalTask
} from "./indexdbLayer";

import {
  queueCreate,
  queueUpdate,
  queueDelete,
  removeQueueJob
} from "./taskQueueOps";

import {
  apiCreateTask,
  apiUpdateTask,
  apiDeleteTask,
  apiShare,
  fetchFromServer
} from "./serverCalls"

export function useTasksEngine() {
  const { userEmail, token } = useAuthStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspace, setWorkspace] = useState(
    localStorage.getItem("workspace") || "personal"
  );

  /* ---------------- LOAD ---------------- */

  const loadTasks = useCallback(async () => {
    if (!userEmail) return;

    await initDB();
    const data = await loadLocalTasks(userEmail, workspace);
    setTasks(data);
  }, [userEmail, workspace]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);


  //from server
  useEffect(() => {
  if (!token || !userEmail) return;

  const sync = async () => {
    await fetchFromServer(userEmail, workspace, token);
    await loadTasks(); // refresh UI after server sync
  };

  sync();

}, [token, userEmail, workspace]);

  const reloadTasks = useCallback(async () => {
    if (!userEmail) return;
    const fresh = await loadLocalTasks(userEmail, workspace);
    setTasks(fresh);
  }, [userEmail, workspace]);

  /* ---------------- CREATE ---------------- */

  async function createTask(text: string, image?: string | null) {
    if (!userEmail) throw new Error("User not authenticated");

    const task: Task = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      archived: false,
      deleted: false,
      image: image || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userEmail,
      workspaceType: workspace,
      syncStatus: "pending"
    };

    await saveLocalTask(task);
    await queueCreate(task, userEmail, workspace);

    setTasks(prev => [...prev, task]);

    if (!token) return;

    try {
      await apiCreateTask(task, token);
    } catch {
      console.log("offline create queued");
    }
  }

  /* ---------------- TOGGLE ---------------- */

  async function toggleComplete(id: string) {
    if (!userEmail) return;

    const task = await getLocalTask(id);
    if (!task) return;

    const updated: Task = {
      ...task,
      completed: !task.completed,
      updatedAt: Date.now(),
      syncStatus: "pending"
    };

    await saveLocalTask(updated);

    const jobId = crypto.randomUUID();
    await queueUpdate(jobId, id, userEmail, { completed: updated.completed });

    setTasks(prev => prev.map(t => (t.id === id ? updated : t)));

    if (!token) return;

    try {
      await apiUpdateTask(id, { completed: updated.completed }, token);

      await saveLocalTask({ ...updated, syncStatus: "synced" });
      await removeQueueJob(jobId);
    } catch {
      console.log("offline toggle queued");
    }
  }

  /* ---------------- DELETE ---------------- */

  async function deleteTask(id: string) {
    if (!userEmail) return;

    await deleteLocalTask(id);
    await queueDelete(id, userEmail, workspace);

    setTasks(prev => prev.filter(t => t.id !== id));

    if (!token) return;

    try {
      await apiDeleteTask(id, token);
    } catch {
      console.log("offline delete queued");
    }
  }

  /* ---------------- EDIT ---------------- */

  async function editTask(id: string, newText: string, newImage?: string | null) {
    if (!userEmail) return;

    const task = await getLocalTask(id);
    if (!task) return;

    const updated: Task = {
      ...task,
      text: newText,
      image: newImage !== undefined ? newImage : task.image,
      updatedAt: Date.now(),
      syncStatus: "pending"
    };

    await saveLocalTask(updated);

    const jobId = crypto.randomUUID();
    await queueUpdate(jobId, id, userEmail, {
      text: updated.text,
      image: updated.image
    });

    setTasks(prev => prev.map(t => (t.id === id ? updated : t)));

    if (!token) return;

    try {
      await apiUpdateTask(id, {
        text: updated.text,
        image: updated.image
      }, token);

      await saveLocalTask({ ...updated, syncStatus: "synced" });
      await removeQueueJob(jobId);
    } catch {
      console.log("offline edit queued");
    }
  }

  /* ---------------- SHARE ---------------- */

  async function shareTask(taskId: string, toEmail: string) {
    if (!token) return;

    const task = await getLocalTask(taskId);
    if (!task) return;

    try {
      await apiShare(task, toEmail, token);
    } catch {
      console.log("share failed");
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
    loadTasks,
    reloadTasks,
    shareTask
  };
}