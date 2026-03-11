import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { initDB, clearWorkspaceDataFromIDB } from "@/infrastructure/lib/idb";
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
  fetchTasksFromServer,
} from "../services/task.service";

import { pullFromServer } from "@/infrastructure/mongoSync/sync";

import {
  addTask as idbAddTask,
  getAllTasks as idbGetAllTasks,
  deleteTaskFromIDB,
  getTaskById,
} from "@/infrastructure/lib/idb";

import { useCollabWebSocket } from "./useCollabWebSocket";
import {
  createServerWorkspace,
  deleteWorkspace as deleteWorkspaceApi,
  listMyWorkspaces,
} from "@/services/workspace.service";

export type WorkspaceOption = {
  value: string;
  label: string;
  emoji: string;
  id?: string;
  memberCount?: number;
  isOwner?: boolean;
};

export type SectionWsHandler = (type: string, payload: unknown) => Promise<void>;

function workspaceKey(email: string) {
  return `workspace:${email}`;
}

function workspaceOptionsKey(email: string) {
  return `workspace-options:${email}`;
}

const DEFAULT_WORKSPACES: WorkspaceOption[] = [
  { value: "personal", label: "Personal", emoji: "🪪", memberCount: 1, isOwner: true },
  { value: "professional", label: "Professional", emoji: "🧑🏻‍💼", memberCount: 1, isOwner: true },
];

function isBuiltInWorkspace(value: string) {
  return value === "personal" || value === "professional";
}

function toWorkspaceValue(name: string) {
  return (
    name.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `workspace-${Date.now()}`
  );
}

function getInitialWorkspaceOptions(email: string): WorkspaceOption[] {
  try {
    const raw = localStorage.getItem(workspaceOptionsKey(email));
    const parsed = raw ? (JSON.parse(raw) as WorkspaceOption[]) : [];
    if (!Array.isArray(parsed)) return DEFAULT_WORKSPACES;

    const merged = new Map<string, WorkspaceOption>();
    for (const opt of DEFAULT_WORKSPACES) merged.set(opt.value, { ...opt });

    for (const opt of parsed) {
      if (!opt?.value || !opt?.label) continue;

      const existing = merged.get(opt.value);
      merged.set(opt.value, {
        value: opt.value,
        label: opt.label,
        emoji: opt.emoji || existing?.emoji || "📁",
        id: isBuiltInWorkspace(opt.value) ? undefined : opt.id,
        memberCount: opt.memberCount ?? existing?.memberCount ?? 1,
        isOwner: opt.isOwner ?? existing?.isOwner ?? true,
      });
    }

    return [...merged.values()];
  } catch {
    return DEFAULT_WORKSPACES;
  }
}

function requireOnline(action: string): boolean {
  if (!navigator.onLine) {
    toast.warning(`You're offline. "${action}" requires an internet connection.`);
    return false;
  }
  return true;
}

export function useTasksEngine() {
  const { userEmail, token } = useAuthStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const pendingTaskCreatesRef = useRef<Set<string>>(new Set());
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOption[]>(() =>
    userEmail ? getInitialWorkspaceOptions(userEmail) : DEFAULT_WORKSPACES
  );
  const [workspace, setWorkspace] = useState<string>(() =>
    userEmail ? localStorage.getItem(workspaceKey(userEmail)) || "personal" : "personal"
  );

  useEffect(() => {
    if (!userEmail) return;
    setWorkspaceOptions(getInitialWorkspaceOptions(userEmail));
    setWorkspace(localStorage.getItem(workspaceKey(userEmail)) || "personal");
  }, [userEmail]);

  const activeWorkspaceOption = workspaceOptions.find((option) => option.value === workspace) ?? null;
  const currentWsId = activeWorkspaceOption?.id ?? null;
  const isSharedWorkspace = (activeWorkspaceOption?.memberCount ?? 1) > 1;
  const isCollabWorkspace = isSharedWorkspace;

  useEffect(() => {
    if (!userEmail || !token || !navigator.onLine) return;

    listMyWorkspaces(token)
      .then(({ workspaces }) => {
        const serverIds = new Set(workspaces.map((workspace) => workspace.workspaceId));

        setWorkspaceOptions((prev) => {
          const byValue = new Map<string, WorkspaceOption>();

          for (const opt of DEFAULT_WORKSPACES) {
            byValue.set(opt.value, { ...opt });
          }

          for (const opt of prev) {
            if (isBuiltInWorkspace(opt.value)) {
              const builtIn = byValue.get(opt.value)!;
              byValue.set(opt.value, {
                ...builtIn,
                label: opt.label || builtIn.label,
              });
              continue;
            }

            if (opt.id && !serverIds.has(opt.id)) continue;
            byValue.set(opt.value, { ...opt });
          }

          for (const serverWorkspace of workspaces) {
            const slug = toWorkspaceValue(serverWorkspace.type);
            const existing = byValue.get(slug);

            if (existing) {
              byValue.set(slug, {
                ...existing,
                label: serverWorkspace.type,
                emoji: serverWorkspace.emoji || existing.emoji,
                id: serverWorkspace.workspaceId,
                memberCount: serverWorkspace.memberCount ?? existing.memberCount ?? 1,
                isOwner: serverWorkspace.isOwner,
              });
              continue;
            }

            const taken = new Set(byValue.keys());
            let finalValue = slug;
            let suffix = 2;
            while (taken.has(finalValue)) {
              finalValue = `${slug}-${suffix}`;
              suffix += 1;
            }

            byValue.set(finalValue, {
              value: finalValue,
              label: serverWorkspace.type,
              emoji: serverWorkspace.emoji || "📁",
              id: serverWorkspace.workspaceId,
              memberCount: serverWorkspace.memberCount ?? 1,
              isOwner: serverWorkspace.isOwner,
            });
          }

          return [...byValue.values()];
        });
      })
      .catch(() => {});
  }, [token, userEmail]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get("workspace");
    if (!targetId) return;

    const match = workspaceOptions.find((option) => option.id === targetId);
    if (match) {
      setWorkspace(match.value);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [workspaceOptions]);

  const addWorkspace = useCallback(
    async (name: string, emoji = "📁") => {
      const trimmed = name.trim();
      if (!trimmed || !userEmail || !token) return false;
      if (!requireOnline("Add Workspace")) return false;

      let serverId: string;
      try {
        const response = await createServerWorkspace(trimmed, emoji, token);
        serverId = response.workspaceId;
      } catch {
        toast.error("Could not create workspace on server. Please try again.");
        return false;
      }

      let nextWorkspaceValue = toWorkspaceValue(trimmed);
      setWorkspaceOptions((prev) => {
        const baseValue = toWorkspaceValue(trimmed);
        let value = baseValue;
        let suffix = 2;
        const existing = new Set(prev.map((option) => option.value));
        while (existing.has(value)) {
          value = `${baseValue}-${suffix}`;
          suffix += 1;
        }

        nextWorkspaceValue = value;

        return [
          ...prev,
          {
            value,
            label: trimmed,
            emoji: emoji.trim() || "📁",
            id: serverId,
            memberCount: 1,
            isOwner: true,
          },
        ];
      });

      setWorkspace(nextWorkspaceValue);
      return true;
    },
    [token, userEmail]
  );

  const deleteWorkspace = useCallback(async () => {
    if (!userEmail || !token || !activeWorkspaceOption?.id) return false;
    if (isBuiltInWorkspace(activeWorkspaceOption.value)) return false;
    if (activeWorkspaceOption.memberCount && activeWorkspaceOption.memberCount > 1 && !activeWorkspaceOption.isOwner) {
      return false;
    }
    if (!requireOnline("Delete Workspace")) return false;

    try {
      await deleteWorkspaceApi(activeWorkspaceOption.id, token);
      await clearWorkspaceDataFromIDB(userEmail, activeWorkspaceOption.value, activeWorkspaceOption.id);
      setWorkspaceOptions((prev) =>
        prev.filter((option) => option.value !== activeWorkspaceOption.value)
      );
      setTasks([]);
      setWorkspace("personal");
      toast.success("Workspace deleted");
      return true;
    } catch {
      toast.error("Workspace delete failed");
      return false;
    }
  }, [activeWorkspaceOption, token, userEmail]);

  useEffect(() => {
    if (!userEmail) return;
    localStorage.setItem(workspaceKey(userEmail), workspace);
  }, [workspace, userEmail]);

  useEffect(() => {
    if (!userEmail) return;
    localStorage.setItem(workspaceOptionsKey(userEmail), JSON.stringify(workspaceOptions));
  }, [workspaceOptions, userEmail]);

  useEffect(() => {
    if (!workspaceOptions.some((option) => option.value === workspace)) {
      setWorkspace("personal");
    }
  }, [workspace, workspaceOptions]);

  const reloadTasks = useCallback(async () => {
    if (!userEmail) return;

    if (isCollabWorkspace) {
      if (!token || !currentWsId) {
        setTasks([]);
        return;
      }

      try {
        const fresh = await fetchTasksFromServer(token, workspace, currentWsId);
        setTasks(fresh.map((task) => ({ ...task, userEmail: task.userEmail || userEmail })));
      } catch {}
      return;
    }

    const fresh = currentWsId
      ? await idbGetAllTasks(userEmail, workspace, currentWsId)
      : await loadLocalTasks(userEmail, workspace);
    setTasks(fresh);
  }, [currentWsId, isCollabWorkspace, token, userEmail, workspace]);

  useEffect(() => {
    if (!userEmail) return;

    (async () => {
      if (isCollabWorkspace) {
        await reloadTasks();
        return;
      }

      await initDB();
      if (token) {
        await pullFromServer(currentWsId ?? workspace, workspace, token, userEmail, Boolean(currentWsId));
      }
      await reloadTasks();
    })();
  }, [currentWsId, isCollabWorkspace, reloadTasks, token, userEmail, workspace]);

  useEffect(() => {
    const handleOnline = async () => {
      if (!token) return;

      if (isCollabWorkspace) {
        await reloadTasks();
        return;
      }

      await processQueue(token);
      await reloadTasks();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [isCollabWorkspace, reloadTasks, token]);

  const sectionWsHandlerRef = useRef<SectionWsHandler | null>(null);
  const registerSectionWsHandler = useCallback((handler: SectionWsHandler) => {
    sectionWsHandlerRef.current = handler;
  }, []);

  const { sendWs } = useCollabWebSocket({
    authToken: token,
    workspaceId: isSharedWorkspace ? currentWsId : null,
    onMessage: async (msg) => {
      switch (msg.type) {
        case "TASK_CREATE":
        case "TASK_UPDATE": {
          const incoming = msg.task as Task;
          if (currentWsId) {
            if (incoming.workspaceId !== currentWsId) break;
          } else if (incoming.workspaceType !== workspace) {
            break;
          }

          const local = isCollabWorkspace
            ? tasks.find((task) => task.id === incoming.id) ?? null
            : await getTaskById(incoming.id).catch(() => null);

          if (!local || incoming.updatedAt > local.updatedAt) {
            const toSave = {
              ...incoming,
              syncStatus: "synced" as const,
              dirty: false,
              ...(currentWsId ? { workspaceId: currentWsId } : {}),
            };
            if (!isCollabWorkspace) await idbAddTask(toSave);
            setTasks((prev) => [...prev.filter((task) => task.id !== incoming.id), toSave]);
          }
          break;
        }

        case "TASK_DELETE":
          if (!isCollabWorkspace) await deleteTaskFromIDB(msg.taskId);
          setTasks((prev) => prev.filter((task) => task.id !== msg.taskId));
          break;

        case "SECTION_CREATE":
        case "SECTION_UPDATE":
          await sectionWsHandlerRef.current?.(msg.type, msg.section);
          break;

        case "SECTION_DELETE":
          await sectionWsHandlerRef.current?.(msg.type, msg.sectionId);
          break;

        case "MEMBER_JOINED":
          toast.info(`${msg.name || msg.email} joined the workspace`);
          break;

        case "MEMBER_REMOVED":
          if (msg.userId === userEmail) {
            if (currentWsId) await clearWorkspaceDataFromIDB(userEmail ?? "", workspace, currentWsId);
            setWorkspaceOptions((prev) =>
              prev.filter((option) => option.id !== msg.workspaceId)
            );
            setWorkspace("personal");
            toast.warning("You were removed from this workspace");
          }
          break;

        case "WORKSPACE_DELETED":
          if (userEmail && msg.workspaceId) {
            const removed = workspaceOptions.find((option) => option.id === msg.workspaceId);
            if (removed) {
              await clearWorkspaceDataFromIDB(userEmail, removed.value, msg.workspaceId);
            }
          }
          setWorkspaceOptions((prev) => prev.filter((option) => option.id !== msg.workspaceId));
          if (currentWsId === msg.workspaceId) {
            setTasks([]);
            setWorkspace("personal");
            toast.warning("Workspace was deleted");
          }
          break;

        default:
          break;
      }
    },
  });

  const broadcastTask = useCallback(
    (_type: "TASK_CREATE" | "TASK_UPDATE", _task: Task) => {
      // Shared task mutations are already broadcast by the REST controllers.
      // Sending them from the client as well causes duplicate WS events.
    },
    []
  );

  const broadcastTaskDelete = useCallback(
    (_taskId: string) => {
      // Shared task deletions are already broadcast by the REST controllers.
    },
    []
  );

  async function createTask(
    text: string,
    imageFile?: File | null,
    sectionId?: string | null,
    reminderAt?: number | null,
    labels: string[] = []
  ) {
    if (!userEmail) throw new Error("User not authenticated");
    const trimmedText = text.trim();
    if (!trimmedText) return null;

    const createKey = [
      isCollabWorkspace ? currentWsId ?? "shared" : workspace,
      sectionId ?? "root",
      trimmedText.toLowerCase(),
    ].join("::");

    if (pendingTaskCreatesRef.current.has(createKey)) {
      return null;
    }

    if (isCollabWorkspace) {
      if (!token || !currentWsId || !requireOnline("Create Task")) return null;
      pendingTaskCreatesRef.current.add(createKey);

      const task: Task = {
        id: crypto.randomUUID(),
        text: trimmedText,
        labels,
        completed: false,
        archived: false,
        deleted: false,
        deletedAt: null,
        image: null,
        imageUrl: null,
        imageUrlExpiry: null,
        reminderAt: reminderAt ?? null,
        sectionId: sectionId ?? null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userEmail,
        workspaceType: workspace,
        workspaceId: currentWsId,
        syncStatus: "synced",
        dirty: false,
        version: 1,
      };

      try {
        const result = await apiCreateTask(task, token, imageFile);
        const createdTask: Task = {
          ...task,
          text: result?.task?.text ?? text,
          labels: result?.task?.labels ?? labels,
          image: result?.task?.imageUrl ?? result?.task?.image ?? null,
          imageUrl: result?.task?.imageUrl ?? null,
          imageUrlExpiry: result?.task?.imageUrlExpiry ?? null,
          reminderAt: result?.task?.reminderAt ?? reminderAt ?? null,
          updatedAt: result?.task?.updatedAt ?? task.updatedAt,
          createdAt: result?.task?.createdAt ?? task.createdAt,
          workspaceId: result?.task?.workspaceId ?? currentWsId,
          version: result?.task?.version ?? 1,
        };
        setTasks((prev) => [...prev.filter((item) => item.id !== createdTask.id), createdTask]);
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
      id: crypto.randomUUID(),
      text: trimmedText,
      labels,
      completed: false,
      archived: false,
      deleted: false,
      deletedAt: null,
      image: null,
      imageUrl: null,
      imageUrlExpiry: null,
      reminderAt: reminderAt ?? null,
      sectionId: sectionId ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userEmail,
      workspaceType: workspace,
      ...(currentWsId ? { workspaceId: currentWsId } : {}),
      syncStatus: "pending",
      dirty: true,
      version: 1,
    };

    await saveLocalTask(task);
    setTasks((prev) => [...prev, task]);

    if (!token) {
      await queueCreate(task, userEmail, workspace, crypto.randomUUID());
      return task;
    }

    try {
      const result = await apiCreateTask(task, token, imageFile);
      const syncedTask: Task = {
        ...task,
        syncStatus: "synced",
        dirty: false,
        image: result?.task?.imageUrl ?? result?.task?.image ?? null,
        imageUrl: result?.task?.imageUrl ?? null,
        imageUrlExpiry: result?.task?.imageUrlExpiry ?? null,
        reminderAt: result?.task?.reminderAt ?? task.reminderAt ?? null,
        labels: result?.task?.labels ?? task.labels,
        workspaceId: result?.task?.workspaceId ?? task.workspaceId ?? null,
        version: result?.task?.version ?? task.version,
      };
      await saveLocalTask(syncedTask);
      setTasks((prev) => prev.map((item) => (item.id === task.id ? syncedTask : item)));
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
      const task = tasks.find((item) => item.id === id);
      if (!task) return;

      try {
        const result = await apiUpdateTask(
          id,
          { completed: !task.completed, version: (task.version ?? 1) + 1 },
          token
        );
        const updatedTask: Task = {
          ...task,
          ...result?.task,
          id,
          image: result?.task?.imageUrl ?? result?.task?.image ?? task.image,
          imageUrl: result?.task?.imageUrl ?? task.imageUrl ?? null,
          imageUrlExpiry: result?.task?.imageUrlExpiry ?? task.imageUrlExpiry ?? null,
          labels: result?.task?.labels ?? task.labels,
          syncStatus: "synced",
          dirty: false,
        };
        setTasks((prev) => prev.map((item) => (item.id === id ? updatedTask : item)));
        broadcastTask("TASK_UPDATE", updatedTask);
      } catch {
        toast.error("Task update failed");
      }
      return;
    }

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
    await queueUpdate(jobId, id, userEmail, { completed: updated.completed, version: updated.version });
    setTasks((prev) => prev.map((item) => (item.id === id ? updated : item)));

    if (!token) return;
    try {
      await apiUpdateTask(id, { completed: updated.completed, version: updated.version }, token);
      await saveLocalTask({ ...updated, syncStatus: "synced" });
      await removeQueueJob(jobId);
      setTasks((prev) =>
        prev.map((item) => (item.id === id ? { ...item, syncStatus: "synced" } : item))
      );
      broadcastTask("TASK_UPDATE", { ...updated, syncStatus: "synced" });
    } catch {}
  }

  async function deleteTask(id: string) {
    if (!userEmail) return;

    if (isCollabWorkspace) {
      if (!token || !requireOnline("Delete Task")) return;
      try {
        await apiDeleteTask(id, token);
        setTasks((prev) => prev.filter((task) => task.id !== id));
        broadcastTaskDelete(id);
      } catch {
        toast.error("Task delete failed");
      }
      return;
    }

    await deleteLocalTask(id);
    const jobId = await queueDelete(id, userEmail, workspace);
    setTasks((prev) => prev.filter((task) => task.id !== id));
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
      const task = tasks.find((item) => item.id === id);
      if (!task) return;

      try {
        const result = await apiUpdateTask(
          id,
          { text: newText, image: newImage, version: (task.version ?? 1) + 1 },
          token
        );
        const updatedTask: Task = {
          ...task,
          ...result?.task,
          id,
          image: result?.task?.imageUrl ?? result?.task?.image ?? newImage ?? task.image,
          imageUrl: result?.task?.imageUrl ?? task.imageUrl ?? null,
          imageUrlExpiry: result?.task?.imageUrlExpiry ?? task.imageUrlExpiry ?? null,
          labels: result?.task?.labels ?? task.labels,
          syncStatus: "synced",
          dirty: false,
        };
        setTasks((prev) => prev.map((item) => (item.id === id ? updatedTask : item)));
        broadcastTask("TASK_UPDATE", updatedTask);
      } catch {
        toast.error("Task edit failed");
      }
      return;
    }

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
    setTasks((prev) => prev.map((item) => (item.id === id ? updated : item)));

    if (!token) return;
    try {
      await apiUpdateTask(id, { text: updated.text, image: updated.image, version: updated.version }, token);
      await saveLocalTask({ ...updated, syncStatus: "synced" });
      await removeQueueJob(jobId);
      setTasks((prev) =>
        prev.map((item) => (item.id === id ? { ...item, syncStatus: "synced" } : item))
      );
      broadcastTask("TASK_UPDATE", { ...updated, syncStatus: "synced" });
    } catch {}
  }

  async function moveTaskToSection(id: string, sectionId: string | null) {
    if (!userEmail) return;

    if (isCollabWorkspace) {
      if (!token || !requireOnline("Move Task")) return;
      const task = tasks.find((item) => item.id === id);
      if (!task) return;

      try {
        const result = await apiUpdateTask(
          id,
          { sectionId, version: (task.version ?? 1) + 1 },
          token
        );
        const updatedTask: Task = {
          ...task,
          ...result?.task,
          id,
          image: result?.task?.imageUrl ?? result?.task?.image ?? task.image,
          imageUrl: result?.task?.imageUrl ?? task.imageUrl ?? null,
          imageUrlExpiry: result?.task?.imageUrlExpiry ?? task.imageUrlExpiry ?? null,
          labels: result?.task?.labels ?? task.labels,
          syncStatus: "synced",
          dirty: false,
        };
        setTasks((prev) => prev.map((item) => (item.id === id ? updatedTask : item)));
        broadcastTask("TASK_UPDATE", updatedTask);
      } catch {
        toast.error("Task move failed");
      }
      return;
    }

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
    await queueUpdate(jobId, id, userEmail, { sectionId, version: updated.version });
    setTasks((prev) => prev.map((item) => (item.id === id ? updated : item)));

    if (!token) return;
    try {
      await apiUpdateTask(id, { sectionId, version: updated.version }, token);
      await saveLocalTask({ ...updated, syncStatus: "synced" });
      await removeQueueJob(jobId);
      setTasks((prev) =>
        prev.map((item) => (item.id === id ? { ...item, syncStatus: "synced" } : item))
      );
      broadcastTask("TASK_UPDATE", { ...updated, syncStatus: "synced" });
    } catch {}
  }

  return {
    tasks,
    workspace,
    setWorkspace,
    workspaceOptions,
    addWorkspace,
    deleteWorkspace,
    createTask,
    toggleComplete,
    deleteTask,
    editTask,
    moveTaskToSection,
    reloadTasks,
    currentWsId,
    isSharedWorkspace,
    sendWs,
    registerSectionWsHandler,
  };
}
