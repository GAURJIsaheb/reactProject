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

export type WorkspaceOption = {
  value: string;
  label: string;
  emoji: string;
};

const WORKSPACE_STORAGE_KEY = "workspace";
const WORKSPACE_OPTIONS_STORAGE_KEY = "workspace-options";

const DEFAULT_WORKSPACES: WorkspaceOption[] = [
  { value: "personal", label: "Personal", emoji: "🪪" },
  { value: "professional", label: "Professional", emoji: "🧑🏻‍💼" },
];

function toWorkspaceValue(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `workspace-${Date.now()}`
  );
}

function getInitialWorkspaceOptions(): WorkspaceOption[] {
  try {
    const raw = localStorage.getItem(WORKSPACE_OPTIONS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as WorkspaceOption[]) : [];

    if (!Array.isArray(parsed)) return DEFAULT_WORKSPACES;

    const merged = new Map<string, WorkspaceOption>();
    for (const option of DEFAULT_WORKSPACES) merged.set(option.value, option);

    for (const option of parsed) {
      if (!option?.value || !option?.label) continue;
      merged.set(option.value, {
        value: option.value,
        label: option.label,
        emoji: option.emoji || "📁",
      });
    }

    return [...merged.values()];
  } catch {
    return DEFAULT_WORKSPACES;
  }
}

export function useTasksEngine() {
  const { userEmail, token } = useAuthStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOption[]>(
    getInitialWorkspaceOptions
  );

  const [workspace, setWorkspace] = useState<string>(
    () => localStorage.getItem(WORKSPACE_STORAGE_KEY) || "personal"
  );

  const addWorkspace = useCallback((name: string, emoji = "📁") => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    setWorkspaceOptions((prev) => {
      const baseValue = toWorkspaceValue(trimmed);
      let value = baseValue;
      let suffix = 2;
      const existingValues = new Set(prev.map((w) => w.value));

      while (existingValues.has(value)) {
        value = `${baseValue}-${suffix}`;
        suffix += 1;
      }

      const next = [...prev, { value, label: trimmed, emoji: emoji.trim() || "📁" }];
      setWorkspace(value);
      return next;
    });

    return true;
  }, []);

  useEffect(() => {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace);
  }, [workspace]);

  useEffect(() => {
    localStorage.setItem(
      WORKSPACE_OPTIONS_STORAGE_KEY,
      JSON.stringify(workspaceOptions)
    );
  }, [workspaceOptions]);

  useEffect(() => {
    const exists = workspaceOptions.some((option) => option.value === workspace);
    if (!exists) setWorkspace("personal");
  }, [workspace, workspaceOptions]);

  const reloadTasks = useCallback(async () => {
    if (!userEmail) return;
    const fresh = await loadLocalTasks(userEmail, workspace);
    setTasks(fresh);
  }, [userEmail, workspace]);

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
  }, [token, userEmail, workspace, reloadTasks]);

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

    await saveLocalTask(task);
    setTasks((prev) => [...prev, task]);

    if (!token) {
      const jobId = crypto.randomUUID();
      await queueCreate(task, userEmail, workspace, jobId);
      return task;
    }

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
      const jobId = crypto.randomUUID();
      await queueCreate(task, userEmail, workspace, jobId);
      return task;
    }
  }

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
      // queued for retry
    }
  }

  async function deleteTask(id: string) {
    if (!userEmail) return;

    await deleteLocalTask(id);

    const jobId = await queueDelete(id, userEmail, workspace);

    setTasks((prev) => prev.filter((t) => t.id !== id));

    if (!token) return;

    try {
      await apiDeleteTask(id, token);
      await removeQueueJob(jobId);
    } catch {
      // queued for retry
    }
  }

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
      // queued for retry
    }
  }

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
      // queued for retry
    }
  }

  return {
    tasks,
    workspace,
    setWorkspace,
    workspaceOptions,
    addWorkspace,
    createTask,
    toggleComplete,
    deleteTask,
    editTask,
    moveTaskToSection,
    reloadTasks,
  };
}
