//All CRUD mutations for tasks
import { useCallback, useRef } from "react";
import { toast } from "sonner";
import type { Task, TaskSubtask } from "@/shared/types/task";
import { addTask as idbAddTask, deleteTaskFromIDB } from "@/infrastructure/lib/idb";
import {
  apiCreateTask,
  apiUpdateTask,
  apiDeleteTask,
} from "@/services/task.service";
import {
  loadLocalTasks as _ll,
  getLocalTask,
  saveLocalTask,
  deleteLocalTask,
} from "../indexdbLayer";
import {
  queueCreate,
  queueUpdate,
  queueDelete,
  removeQueueJob,
} from "../taskQueueOps";
import {
  cannotCompleteTask,
  getIncompleteSubtasksMessage,
  normalizeSubtasks,
} from "@/shared/lib/subtasks";
import {
  buildOptimisticTask,
  normalizeDraftSubtasks,
} from "@/features/tasks/lib/taskMappers";

function requireOnline(action: string): boolean {
  if (!navigator.onLine) {
    toast.warning(`You're offline. "${action}" requires an internet connection.`);
    return false;
  }
  return true;
}

interface UseTaskMutationsParams {
  userEmail:         string | null;
  token:             string | null;
  workspace:         string;
  currentWsId:       string | null;
  isCollabWorkspace: boolean;
  tasks:             Task[];
  setTasks:          React.Dispatch<React.SetStateAction<Task[]>>;
}

export function useTaskMutations({
  userEmail,
  token,
  workspace,
  currentWsId,
  isCollabWorkspace,
  tasks,
  setTasks,
}: UseTaskMutationsParams) {

  const pendingTaskCreatesRef = useRef<Set<string>>(new Set());
  const incompleteMsg         = getIncompleteSubtasksMessage();

  const guardTaskCompletion = useCallback((task: Task) => {
    if (!task.completed && cannotCompleteTask(task.subtasks)) {
      toast.error(incompleteMsg.title, { description: incompleteMsg.description, duration: 3200 });
      return false;
    }
    return true;
  }, [incompleteMsg.description, incompleteMsg.title]);

  // no-op: server already broadcasts via WS
  const broadcastTask       = useCallback((_type: "TASK_CREATE" | "TASK_UPDATE", _task: Task) => {}, []);
  const broadcastTaskDelete = useCallback((_taskId: string) => {}, []);

  async function createTask(
    text:       string,
    imageFile?: File | null,
    sectionId?: string | null,
    reminderAt?: number | null,
    labels:     string[]                      = [],
    subtasks:   Pick<TaskSubtask, "text">[]   = [],
  ) {
    if (!userEmail) throw new Error("User not authenticated");
    const trimmedText       = text.trim();
    if (!trimmedText) return null;
    const normalizedSubtasks = normalizeDraftSubtasks(subtasks);

    const createKey = [
      isCollabWorkspace ? currentWsId ?? "shared" : workspace,
      sectionId ?? "root",
      trimmedText.toLowerCase(),
    ].join("::");
    if (pendingTaskCreatesRef.current.has(createKey)) return null;

    if (isCollabWorkspace) {
      if (!token || !currentWsId || !requireOnline("Create Task")) return null;
      pendingTaskCreatesRef.current.add(createKey);

      const task: Task = {
        id: crypto.randomUUID(), text: trimmedText, labels,
        subtasks: normalizedSubtasks, completed: false, archived: false,
        deleted: false, deletedAt: null, image: null, imageUrl: null,
        imageUrlExpiry: null, reminderAt: reminderAt ?? null,
        sectionId: sectionId ?? null, createdAt: Date.now(), updatedAt: Date.now(),
        userEmail, workspaceType: workspace, workspaceId: currentWsId,
        syncStatus: "synced", dirty: false, version: 1,
      };

      try {
        const result      = await apiCreateTask(task, token, imageFile);
        const createdTask: Task = {
          ...task,
          text:           result?.task?.text           ?? text,
          labels:         result?.task?.labels         ?? labels,
          subtasks:       normalizeSubtasks(result?.task?.subtasks ?? task.subtasks),
          image:          result?.task?.imageUrl       ?? result?.task?.image ?? null,
          imageUrl:       result?.task?.imageUrl       ?? null,
          imageUrlExpiry: result?.task?.imageUrlExpiry ?? null,
          reminderAt:     result?.task?.reminderAt     ?? reminderAt ?? null,
          updatedAt:      result?.task?.updatedAt      ?? task.updatedAt,
          createdAt:      result?.task?.createdAt      ?? task.createdAt,
          workspaceId:    result?.task?.workspaceId    ?? currentWsId,
          version:        result?.task?.version        ?? 1,
        };
        await idbAddTask(createdTask);
        setTasks((prev) => [...prev.filter((t) => t.id !== createdTask.id), createdTask]);
        return createdTask;
      } catch {
        toast.error("Task couldn't be created on the server");
        return null;
      } finally {
        pendingTaskCreatesRef.current.delete(createKey);
      }
    }

    pendingTaskCreatesRef.current.add(createKey);
    const task: Task = {
      id: crypto.randomUUID(), text: trimmedText, labels,
      subtasks: normalizedSubtasks, completed: false, archived: false,
      deleted: false, deletedAt: null, image: null, imageUrl: null,
      imageUrlExpiry: null, reminderAt: reminderAt ?? null,
      sectionId: sectionId ?? null, createdAt: Date.now(), updatedAt: Date.now(),
      userEmail, workspaceType: workspace,
      ...(currentWsId ? { workspaceId: currentWsId } : {}),
      syncStatus: "pending", dirty: true, version: 1,
    };

    await saveLocalTask(task);
    setTasks((prev) => [...prev, task]);

    if (!token) {
      await queueCreate(task, userEmail, workspace, crypto.randomUUID());
      return task;
    }

    try {
      const result     = await apiCreateTask(task, token, imageFile);
      const syncedTask: Task = {
        ...task,
        syncStatus:     "synced", dirty: false,
        subtasks:       normalizeSubtasks(result?.task?.subtasks ?? task.subtasks),
        image:          result?.task?.imageUrl       ?? result?.task?.image ?? null,
        imageUrl:       result?.task?.imageUrl       ?? null,
        imageUrlExpiry: result?.task?.imageUrlExpiry ?? null,
        reminderAt:     result?.task?.reminderAt     ?? task.reminderAt ?? null,
        labels:         result?.task?.labels         ?? task.labels,
        workspaceId:    result?.task?.workspaceId    ?? task.workspaceId ?? null,
        version:        result?.task?.version        ?? task.version,
      };
      await saveLocalTask(syncedTask);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? syncedTask : t)));
      return syncedTask;
    } catch {
      await queueCreate(task, userEmail, workspace, crypto.randomUUID());
      return task;
    } finally {
      pendingTaskCreatesRef.current.delete(createKey);
    }
  }

  async function toggleComplete(id: string) {
    if (!userEmail) return;

    if (isCollabWorkspace) {
      if (!token || !requireOnline("Update Task")) return;
      const task = tasks.find((t) => t.id === id);
      if (!task || !guardTaskCompletion(task)) return;

      try {
        const result      = await apiUpdateTask(id, { completed: !task.completed, version: (task.version ?? 1) + 1 }, token);
        const updatedTask = buildOptimisticTask(task, {
          ...result?.task,
          subtasks:       normalizeSubtasks(result?.task?.subtasks       ?? task.subtasks),
          image:          result?.task?.imageUrl  ?? result?.task?.image ?? task.image,
          imageUrl:       result?.task?.imageUrl  ?? task.imageUrl       ?? null,
          imageUrlExpiry: result?.task?.imageUrlExpiry ?? task.imageUrlExpiry ?? null,
          labels:         result?.task?.labels    ?? task.labels,
        });
        await idbAddTask(updatedTask);
        setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));
        broadcastTask("TASK_UPDATE", updatedTask);
      } catch {
        toast.error("Task update failed");
      }
      return;
    }

    const task = await getLocalTask(id);
    if (!task || !guardTaskCompletion(task)) return;

    const updated: Task = { ...task, completed: !task.completed, updatedAt: Date.now(), syncStatus: "pending", version: (task.version ?? 1) + 1 };
    await saveLocalTask(updated);
    const jobId = crypto.randomUUID();
    await queueUpdate(jobId, id, userEmail, { completed: updated.completed, version: updated.version });
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));

    if (!token) return;
    try {
      await apiUpdateTask(id, { completed: updated.completed, version: updated.version }, token);
      await saveLocalTask({ ...updated, syncStatus: "synced" });
      await removeQueueJob(jobId);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, syncStatus: "synced" } : t)));
      broadcastTask("TASK_UPDATE", { ...updated, syncStatus: "synced" });
    } catch {}
  }

  async function deleteTask(id: string) {
    if (!userEmail) return;

    if (isCollabWorkspace) {
      if (!token || !requireOnline("Delete Task")) return;
      try {
        await apiDeleteTask(id, token);
        await deleteTaskFromIDB(id);
        setTasks((prev) => prev.filter((t) => t.id !== id));
        broadcastTaskDelete(id);
      } catch {
        toast.error("Task delete failed");
      }
      return;
    }

    await deleteLocalTask(id);
    const jobId = await queueDelete(id, userEmail, workspace);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    broadcastTaskDelete(id);

    if (!token) return;
    try {
      await apiDeleteTask(id, token);
      await removeQueueJob(jobId);
    } catch {}
  }

  async function editTask(id: string, newText: string, newImage?: string | null) {
    if (!userEmail) return;

    if (isCollabWorkspace) {
      if (!token || !requireOnline("Edit Task")) return;
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      try {
        const result      = await apiUpdateTask(id, { text: newText, image: newImage, version: (task.version ?? 1) + 1 }, token);
        const updatedTask = buildOptimisticTask(task, {
          ...result?.task,
          subtasks:       normalizeSubtasks(result?.task?.subtasks ?? task.subtasks),
          image:          result?.task?.imageUrl ?? result?.task?.image ?? newImage ?? task.image,
          imageUrl:       result?.task?.imageUrl ?? task.imageUrl ?? null,
          imageUrlExpiry: result?.task?.imageUrlExpiry ?? task.imageUrlExpiry ?? null,
          labels:         result?.task?.labels   ?? task.labels,
        });
        await idbAddTask(updatedTask);
        setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));
        broadcastTask("TASK_UPDATE", updatedTask);
      } catch {
        toast.error("Task edit failed");
      }
      return;
    }

    const task = await getLocalTask(id);
    if (!task) return;

    const updated: Task = {
      ...task, text: newText,
      image:      newImage !== undefined ? newImage : task.image,
      updatedAt:  Date.now(), syncStatus: "pending",
      version:    (task.version ?? 1) + 1,
    };
    await saveLocalTask(updated);
    const jobId = crypto.randomUUID();
    await queueUpdate(jobId, id, userEmail, { text: updated.text, image: updated.image, version: updated.version });
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));

    if (!token) return;
    try {
      await apiUpdateTask(id, { text: updated.text, image: updated.image, version: updated.version }, token);
      await saveLocalTask({ ...updated, syncStatus: "synced" });
      await removeQueueJob(jobId);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, syncStatus: "synced" } : t)));
      broadcastTask("TASK_UPDATE", { ...updated, syncStatus: "synced" });
    } catch {}
  }

  async function moveTaskToSection(id: string, sectionId: string | null) {
    if (!userEmail) return;

    if (isCollabWorkspace) {
      if (!token || !requireOnline("Move Task")) return;
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      try {
        const result      = await apiUpdateTask(id, { sectionId, version: (task.version ?? 1) + 1 }, token);
        const updatedTask = buildOptimisticTask(task, {
          ...result?.task,
          subtasks:       normalizeSubtasks(result?.task?.subtasks ?? task.subtasks),
          image:          result?.task?.imageUrl ?? result?.task?.image ?? task.image,
          imageUrl:       result?.task?.imageUrl ?? task.imageUrl ?? null,
          imageUrlExpiry: result?.task?.imageUrlExpiry ?? task.imageUrlExpiry ?? null,
          labels:         result?.task?.labels   ?? task.labels,
        });
        await idbAddTask(updatedTask);
        setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));
        broadcastTask("TASK_UPDATE", updatedTask);
      } catch {
        toast.error("Task move failed");
      }
      return;
    }

    const task = await getLocalTask(id);
    if (!task) return;

    const updated: Task = { ...task, sectionId, updatedAt: Date.now(), syncStatus: "pending", version: (task.version ?? 1) + 1 };
    await saveLocalTask(updated);
    const jobId = crypto.randomUUID();
    await queueUpdate(jobId, id, userEmail, { sectionId, version: updated.version });
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));

    if (!token) return;
    try {
      await apiUpdateTask(id, { sectionId, version: updated.version }, token);
      await saveLocalTask({ ...updated, syncStatus: "synced" });
      await removeQueueJob(jobId);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, syncStatus: "synced" } : t)));
      broadcastTask("TASK_UPDATE", { ...updated, syncStatus: "synced" });
    } catch {}
  }

  return { createTask, toggleComplete, deleteTask, editTask, moveTaskToSection };
}