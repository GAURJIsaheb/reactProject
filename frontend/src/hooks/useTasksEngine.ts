import { useEffect, useState } from "react";
import {
  initDB,
  addTask,
  getAllTasks,
  getTaskById,
  addToQueue,
  upsertQueue,
  removeTaskUpdatesFromQueue
} from "@/lib/idb";
import { authHeaders } from "@/api/authApi";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/context/AuthContext";


export interface Task {
  id: string;
  text: string;
  completed: boolean;
  archived: boolean;
  deleted?: boolean;
  image?: string | null;
  createdAt: number;
  updatedAt?: number;
  userEmail: string;
  workspaceType: string;
  syncStatus: "pending" | "synced";
}

const API_BASE = "http://localhost:3000";

export function useTasksEngine() {

  const { user } = useAuth();

  const reloadTasks = async () => {
    if (!user) return;
    const fresh = await getAllTasks(user.email, "personal");
    setTasks(fresh);
  };


  const { userEmail} = useAuthStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspace, setWorkspace] = useState(
    localStorage.getItem("workspace") || "personal"
  );

  // INITIAL LOAD
  useEffect(() => {
    loadTasks();
  }, [workspace]);

  async function loadTasks() {
    if (!userEmail) return;
    await initDB();
    const data = await getAllTasks(userEmail, workspace);
    setTasks(data);
  }



  // ADD TASK
  async function createTask(text: string,image?: string | null) {
      if (!userEmail) {
    throw new Error("User not authenticated");
  }

  const email = userEmail;

    const task: Task = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      archived: false,
      image: image || null,
      createdAt: Date.now(),
      userEmail: email,
      workspaceType: workspace,
      syncStatus: "pending"
    };

    await addTask(task);

    await addToQueue({
      id: crypto.randomUUID(),
      action: "create",
      taskId: task.id,
      userEmail,
      workspaceType: workspace,
      payload: { text: task.text },
      retry: 0,
      nextRetry: Date.now()
    });

    setTasks(prev => [...prev, task]);

    // optimistic server push
    try {
      await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(task)
      });
    } catch {}
  }

  // TOGGLE COMPLETE
  async function toggleComplete(id: string) {
      if (!userEmail) {
        throw new Error("User not authenticated");
    }

  const email = userEmail;
    const task = await getTaskById(id);
    if (!task) return;

    task.completed = !task.completed;
    task.syncStatus = "pending";
    task.updatedAt = Date.now();

    await addTask(task);

    await upsertQueue({
      id: crypto.randomUUID(),
      action: "update",
      taskId: id,
      userEmail:email,
      payload: { completed: task.completed },
      retry: 0,
      nextRetry: Date.now()
    });

    setTasks(prev =>
      prev.map(t => (t.id === id ? task : t))
    );
  }

  // DELETE
  async function deleteTask(id: string) {
    const task = await getTaskById(id);
    if (!task) return;

    task.deleted = true;
    task.syncStatus = "pending";

    await addTask(task);
    await removeTaskUpdatesFromQueue(id);
      if (!userEmail) {
        throw new Error("User not authenticated");
    }

     const email = userEmail;

    await addToQueue({
      id: crypto.randomUUID(),
      action: "delete",
      taskId: id,
      userEmail:email,
      workspaceType: workspace,
      payload: null,
      retry: 0,
      nextRetry: Date.now()
    });

    setTasks(prev => prev.filter(t => t.id !== id));
  }

  // ARCHIVE
  async function archiveSelected(selectedIds: string[]) {
    for (const id of selectedIds) {
      const task = await getTaskById(id);
      if (!task) continue;

      task.archived = true;
      task.syncStatus = "pending";
      task.updatedAt = Date.now();

      await addTask(task);
        if (!userEmail) {
            throw new Error("User not authenticated");
        }

        const email = userEmail;

      await upsertQueue({
        id: crypto.randomUUID(),
        action: "update",
        taskId: id,
        userEmail:email,
        payload: { archived: true },
        retry: 0,
        nextRetry: Date.now()
      });
    }

    loadTasks();
  }

  return {
    tasks,
    workspace,
    setWorkspace,
    createTask,
    toggleComplete,
    deleteTask,
    archiveSelected,
    loadTasks,
    reloadTasks
  };
}
