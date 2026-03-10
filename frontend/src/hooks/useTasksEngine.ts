import { useEffect, useState, useCallback, useRef } from "react";   // ← added useRef
import { toast } from "sonner";
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
} from "../services/task.service";

import { pullFromServer } from "@/infrastructure/mongoSync/sync";

import {
  addTask       as idbAddTask,
  getAllTasks    as idbGetAllTasks,
  deleteTaskFromIDB,
  getTaskById,
} from "@/infrastructure/lib/idb";

import { useCollabWebSocket } from "./useCollabWebSocket";
import { createServerWorkspace, listMyWorkspaces } from "@/services/workspace.service";

export type WorkspaceOption = {
  value: string;
  label: string;
  emoji: string;
  id?:   string;
};

// ← NEW: type for the section WS handler injected by useSectionsEngine
export type SectionWsHandler = (type: string, payload: unknown) => Promise<void>;

// ── Per-user localStorage keys ────────────────────────────────────────────────
function workspaceKey(email: string)        { return `workspace:${email}`; }
function workspaceOptionsKey(email: string) { return `workspace-options:${email}`; }

const DEFAULT_WORKSPACES: WorkspaceOption[] = [
  { value: "personal",     label: "Personal",     emoji: "🪪" },
  { value: "professional", label: "Professional", emoji: "🧑🏻‍💼" },
];

function toWorkspaceValue(name: string) {
  return (
    name.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `workspace-${Date.now()}`
  );
}

function getInitialWorkspaceOptions(email: string): WorkspaceOption[] {
  try {
    const raw    = localStorage.getItem(workspaceOptionsKey(email));
    const parsed = raw ? (JSON.parse(raw) as WorkspaceOption[]) : [];
    if (!Array.isArray(parsed)) return DEFAULT_WORKSPACES;

    const merged = new Map<string, WorkspaceOption>();
    for (const opt of DEFAULT_WORKSPACES) merged.set(opt.value, opt);
    for (const opt of parsed) {
      if (!opt?.value || !opt?.label) continue;
      merged.set(opt.value, {
        value: opt.value,
        label: opt.label,
        emoji: opt.emoji || "📁",
        id:    opt.id,
      });
    }
    return [...merged.values()];
  } catch {
    return DEFAULT_WORKSPACES;
  }
}

// ── Online guard for workspace ops ────────────────────────────────────────────
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

  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOption[]>(() =>
    userEmail ? getInitialWorkspaceOptions(userEmail) : DEFAULT_WORKSPACES
  );

  const [workspace, setWorkspace] = useState<string>(() =>
    userEmail
      ? (localStorage.getItem(workspaceKey(userEmail)) || "personal")
      : "personal"
  );

  // Re-initialise when user changes (logout → login as different account)
  useEffect(() => {
    if (!userEmail) return;
    setWorkspaceOptions(getInitialWorkspaceOptions(userEmail));
    setWorkspace(localStorage.getItem(workspaceKey(userEmail)) || "personal");
  }, [userEmail]);

  const currentWsId = workspaceOptions.find((o) => o.value === workspace)?.id ?? null;

  // ── Sync shared workspaces from server on boot ────────────────────────────
  useEffect(() => {
    if (!userEmail || !token || !navigator.onLine) return;

    listMyWorkspaces(token!)
      .then(({ workspaces }) => {
        if (!workspaces?.length) return;

        setWorkspaceOptions((prev) => {
          // value-keyed map so we can update defaults in-place
          const byValue = new Map(prev.map((o) => [o.value, { ...o }]));

          for (const sw of workspaces) {
            // 1. Already tracked by server ID — skip
            if (prev.some((o) => o.id === sw.workspaceId)) continue;

            // 2. Default workspace (personal/professional) — backfill serverId,
            //    never create a duplicate entry
            const slug = toWorkspaceValue(sw.type);
            if (byValue.has(slug)) {
              const opt = byValue.get(slug)!;
              if (!opt.id) {
                byValue.set(slug, { ...opt, id: sw.workspaceId, emoji: sw.emoji || opt.emoji });
              }
              continue;
            }

            // 3. Genuinely new collab workspace — add it
            const taken      = new Set([...byValue.keys()]);
            const finalValue = taken.has(slug) ? `${slug}-collab` : slug;
            byValue.set(finalValue, {
              value: finalValue,
              label: sw.type,
              emoji: sw.emoji || '📁',
              id:    sw.workspaceId,
            });
          }

          return [...byValue.values()];
        });
      })
      .catch(() => { /* non-fatal */ });
  }, [userEmail, token]);

  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
    const targetId = params.get("workspace");
    if (!targetId) return;

    const match = workspaceOptions.find((o) => o.id === targetId);
    if (match) {
      setWorkspace(match.value);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [workspaceOptions]);

  // ── Workspace management ──────────────────────────────────────────────────
  const addWorkspace = useCallback(
    async (name: string, emoji = "📁") => {
      const trimmed = name.trim();
      if (!trimmed || !userEmail) return false;
      if (!requireOnline("Add Workspace")) return false;

      let serverId: string | undefined;
      try {
        const res = await createServerWorkspace(trimmed, emoji, token!);
        serverId  = res.workspaceId;
      } catch (e) {
        toast.error("Could not create workspace on server. Please try again.");
        return false;
      }

      setWorkspaceOptions((prev) => {
        const baseValue = toWorkspaceValue(trimmed);
        let value       = baseValue;
        let suffix      = 2;
        const existing  = new Set(prev.map((w) => w.value));
        while (existing.has(value)) { value = `${baseValue}-${suffix}`; suffix += 1; }

        const next = [
          ...prev,
          { value, label: trimmed, emoji: emoji.trim() || "📁", id: serverId },
        ];
        setWorkspace(value);
        return next;
      });

      return true;
    },
    [userEmail, token]
  );

  // ── Persist per-user ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!userEmail) return;
    localStorage.setItem(workspaceKey(userEmail), workspace);
  }, [workspace, userEmail]);

  useEffect(() => {
    if (!userEmail) return;
    localStorage.setItem(workspaceOptionsKey(userEmail), JSON.stringify(workspaceOptions));
  }, [workspaceOptions, userEmail]);

  useEffect(() => {
    const exists = workspaceOptions.some((o) => o.value === workspace);
    if (!exists) setWorkspace("personal");
  }, [workspace, workspaceOptions]);

  // ── Task loading ──────────────────────────────────────────────────────────
  const reloadTasks = useCallback(async () => {
    if (!userEmail) return;
    // Collab: query by server workspaceId so ALL members' tasks are visible
    // Personal: fall back to original workspaceType slug query
    const fresh = currentWsId
      ? await idbGetAllTasks(userEmail, workspace, currentWsId)
      : await loadLocalTasks(userEmail, workspace);
    setTasks(fresh);
  }, [userEmail, workspace, currentWsId]);

  useEffect(() => {
    if (!userEmail) return;
    (async () => {
      await initDB();
      if (token) await pullFromServer(currentWsId ?? workspace, workspace, token, userEmail, !!currentWsId);
      await reloadTasks();
    })();
  }, [token, userEmail, workspace, currentWsId, reloadTasks]);

  useEffect(() => {
    const handleOnline = async () => {
      if (token) { await processQueue(token); await reloadTasks(); }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [token, reloadTasks]);

  // ← NEW: ref that useSectionsEngine will populate via registerSectionWsHandler
  const sectionWsHandlerRef = useRef<SectionWsHandler | null>(null);
  const registerSectionWsHandler = useCallback((handler: SectionWsHandler) => {
    sectionWsHandlerRef.current = handler;
  }, []);

  // ── WebSocket + OCC ───────────────────────────────────────────────────────
  const { sendWs } = useCollabWebSocket({
    authToken:   token,
    workspaceId: currentWsId,
    onMessage:   async (msg) => {
      switch (msg.type) {
        case "TASK_CREATE":
        case "TASK_UPDATE": {
          const incoming = msg.task as Task;
          // For collab: match by workspaceId. For personal: match by workspaceType.
          if (currentWsId) {
            if (incoming.workspaceId !== currentWsId) break;
          } else {
            if (incoming.workspaceType !== workspace) break;
          }
          const local = await getTaskById(incoming.id).catch(() => null);
          if (!local || incoming.updatedAt > local.updatedAt) {
            // Save workspaceId so byWorkspaceId IDB index works for collab
            const toSave = {
              ...incoming,
              syncStatus: "synced" as const,
              ...(currentWsId ? { workspaceId: currentWsId } : {}),
            };
            await idbAddTask(toSave);
            setTasks((prev) => {
              const filtered = prev.filter((t) => t.id !== incoming.id);
              return [...filtered, toSave];
            });
          }
          break;
        }
        case "TASK_DELETE":
          await deleteTaskFromIDB(msg.taskId);
          setTasks((prev) => prev.filter((t) => t.id !== msg.taskId));
          break;

        // ← NEW: route section events to useSectionsEngine
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
            toast.warning("You were removed from this workspace");
            setWorkspace("personal");
          }
          break;
        default:
          break;
      }
    },
  });

  const broadcastTask = useCallback(
    (type: "TASK_CREATE" | "TASK_UPDATE", task: Task) => {
      if (!currentWsId) return;
      sendWs({ type, workspaceId: currentWsId, task });
    },
    [currentWsId, sendWs]
  );

  const broadcastTaskDelete = useCallback(
    (taskId: string) => {
      if (!currentWsId) return;
      sendWs({ type: "TASK_DELETE", workspaceId: currentWsId, taskId });
    },
    [currentWsId, sendWs]
  );

  // ── CRUD ──────────────────────────────────────────────────────────────────
  async function createTask(text: string, imageFile?: File | null, sectionId?: string | null) {
    if (!userEmail) throw new Error("User not authenticated");

    const task: Task = {
      id:            crypto.randomUUID(),
      text,
      completed:     false,
      archived:      false,
      deleted:       false,
      deletedAt:     null,
      image:         null,
      sectionId:     sectionId ?? null,
      createdAt:     Date.now(),
      updatedAt:     Date.now(),
      userEmail,
      workspaceType: workspace,
      // Save server workspaceId so collab getAllTasks(workspaceId) finds it
      ...(currentWsId ? { workspaceId: currentWsId } : {}),
      syncStatus:    "pending",
      dirty:      true,
      version:       1,
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
        dirty:      false,
        image:      result?.task?.imageUrl ?? result?.task?.image ?? null,
      };
      await saveLocalTask(syncedTask);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? syncedTask : t)));
      broadcastTask("TASK_CREATE", syncedTask);
      return syncedTask;
    } catch {
      await queueCreate(task, userEmail, workspace, crypto.randomUUID());
      return task;
    }
  }

  async function toggleComplete(id: string) {
    if (!userEmail) return;
    const task = await getLocalTask(id);
    if (!task) return;

    const updated: Task = {
      ...task,
      completed:  !task.completed,
      updatedAt:  Date.now(),
      syncStatus: "pending",
      version:    (task.version ?? 1) + 1,
    };

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
    } catch { /* queued */ }
  }

  async function deleteTask(id: string) {
    if (!userEmail) return;
    await deleteLocalTask(id);
    const jobId = await queueDelete(id, userEmail, workspace);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    broadcastTaskDelete(id);

    if (!token) return;
    try {
      await apiDeleteTask(id, token);
      await removeQueueJob(jobId);
    } catch { /* queued */ }
  }

  async function editTask(id: string, newText: string, newImage?: string | null) {
    if (!userEmail) return;
    const task = await getLocalTask(id);
    if (!task) return;

    const updated: Task = {
      ...task,
      text:       newText,
      image:      newImage !== undefined ? newImage : task.image,
      updatedAt:  Date.now(),
      syncStatus: "pending",
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
    } catch { /* queued */ }
  }

  async function moveTaskToSection(id: string, sectionId: string | null) {
    if (!userEmail) return;
    const task = await getLocalTask(id);
    if (!task) return;

    const updated: Task = {
      ...task,
      sectionId,
      updatedAt:  Date.now(),
      syncStatus: "pending",
      version:    (task.version ?? 1) + 1,
    };

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
    } catch { /* queued */ }
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
    // ← NEW: collab additions consumed by Dashboard + useSectionsEngine
    currentWsId,
    sendWs,
    registerSectionWsHandler,
  };
}