import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useAuthStore } from "@/zustand/authStore";
import { useTasksEngine } from "@/hooks/useTasksEngine";
import { useSectionsEngine } from "@/hooks/useSectionsEngine";
import { useTheme } from "@/shared/components/toggleTheme/theme";
import { toast } from "sonner";

import HeaderSection from "./components/HeaderSection";
import StatsBar from "./components/StatsBar";
import SearchBar from "./components/SearchBar";
import Archive from "@/archive/archive";
import KanbanBoard from "./kanban/KanbanBoard";
import EmptyBoardState from "./components/EmptyBoardState";
import KanbanSkeleton from "./components/KanbanSkeleton";

import ViewTaskDialog from "@/shared/components/tasks/editTaskDialog";

import { useDashboardState } from "./hooks/useDashboardState";
import { useDashboardDerived } from "./hooks/useDashboardDerived";
import { useTaskActions } from "./hooks/useTaskActions";
import { useWorkspaceSync } from "./hooks/useWorkspaceSync";
import {
  getAllNotifications,
  getNotificationById,
  upsertNotification,
  markAllNotificationsReadInIDB,
  softDeleteNotificationInIDB,
} from "@/infrastructure/lib/idb";
import type { AppNotification } from "@/shared/types/notification";
import { apiDeleteNotification, apiMarkAllNotificationsRead } from "@/services/notification.service";
import { queueNotificationDelete } from "@/hooks/taskQueueOps";

import InputSection from "./components/InputSection";

type LocalReminder = {
  taskId: string;
  taskText: string;
  dueAt: number;
  notified: boolean;
  read: boolean;
};

type BellNotification = {
  id: string;
  taskId: string;
  taskText: string;
  dueAt: number;
  read: boolean;
  source: "reminder" | "completion";
};

export default function Dashboard() {

  // ───────── AUTH ─────────
  const { logout, userEmail, userName, token } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  // ───────── ENGINES ─────────
  const {
    tasks,
    workspace,
    setWorkspace,
    createTask,
    toggleComplete,
    deleteTask,
    reloadTasks,
  } = useTasksEngine();

  const {
    sections,
    createSection,
    renameSection,
    deleteSection,
    reorderSections,
    loadSections,
  } = useSectionsEngine(workspace);

  // ───────── LOCAL DASHBOARD STATE ─────────
  const state = useDashboardState();
  const {
    loading, setLoading,
    viewTask, setViewTask,
    search, setSearch,
    sort,
    activeSectionId, setActiveSectionId,
    input, setInput,
    imageFile, setImageFile,
    reminderDate, setReminderDate,
    reminderTime, setReminderTime,
    workspaceId, setWorkspaceId,
    taskInputRef
  } = state;

  const reminderStorageKey = useMemo(
    () => `task-reminders:${userEmail ?? "guest"}:${workspace}`,
    [userEmail, workspace]
  );
  const [reminders, setReminders] = useState<Record<string, LocalReminder>>({});
  const [completionNotifications, setCompletionNotifications] = useState<AppNotification[]>([]);

  // ───────── DERIVED DATA ─────────
  const derived = useDashboardDerived(tasks, sections, search, sort, activeSectionId);
  const { activeTasks, completedTasks, hasNoSections, sortedTasks , activeSectionLabel} = derived;

  // ───────── SYNC ENGINE ─────────
  useWorkspaceSync(
    workspace,
    token,
    userEmail,
    setWorkspaceId,
    workspaceId,
    reloadTasks,
    loadSections,
    async () => {
      if (!userEmail) return;
      const next = await getAllNotifications(userEmail, workspace);
      setCompletionNotifications(next);
    }
  );

  // ───────── TASK ACTIONS ─────────
  const actions = useTaskActions({
    input, setInput,
    imageFile, setImageFile,
    reminderDate, setReminderDate,
    reminderTime, setReminderTime,
    activeSectionId, setActiveSectionId,
    sections, hasNoSections,
    tasks, createTask, deleteTask, reloadTasks,
    workspace, userEmail, token, taskInputRef,
    onTaskReminderSet: (taskId, taskText, dueAt) => {
      setReminders((prev) => {
        if (!dueAt) {
          const copy = { ...prev };
          delete copy[taskId];
          return copy;
        }
        return {
          ...prev,
          [taskId]: {
            taskId,
            taskText,
            dueAt,
            notified: false,
            read: false,
          },
        };
      });
    },
  });

  // ───────── BOOT LOADING ─────────
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setActiveSectionId(null);
  }, [workspace]);

  const reloadCompletionNotifications = useCallback(async () => {
    if (!userEmail) {
      setCompletionNotifications([]);
      return;
    }
    const next = await getAllNotifications(userEmail, workspace);
    setCompletionNotifications(next);
  }, [userEmail, workspace]);

  useEffect(() => {
    reloadCompletionNotifications();
  }, [reloadCompletionNotifications]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(reminderStorageKey);
      setReminders(raw ? JSON.parse(raw) : {});
    } catch {
      setReminders({});
    }
  }, [reminderStorageKey]);

  useEffect(() => {
    localStorage.setItem(reminderStorageKey, JSON.stringify(reminders));
  }, [reminders, reminderStorageKey]);

  useEffect(() => {
    const aliveTaskIds = new Set(tasks.map((t) => t.id));
    setReminders((prev) => {
      let changed = false;
      const next: Record<string, LocalReminder> = {};
      for (const [taskId, reminder] of Object.entries(prev)) {
        if (aliveTaskIds.has(taskId)) next[taskId] = reminder;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [tasks]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setReminders((prev) => {
        let changed = false;
        const next: Record<string, LocalReminder> = { ...prev };
        for (const [taskId, reminder] of Object.entries(prev)) {
          if (!reminder.notified && reminder.dueAt <= now) {
            changed = true;
            next[taskId] = { ...reminder, notified: true, read: false };
            toast("Reminder due", {
              description: reminder.taskText,
              duration: 4000,
            });
          }
        }
        return changed ? next : prev;
      });
    }, 15000);

    return () => window.clearInterval(timer);
  }, []);

  const completedById = useMemo(
    () => new Map(tasks.map((t) => [t.id, t.completed])),
    [tasks]
  );

  const prevCompletedRef = useRef<Map<string, boolean>>(new Map());
  useEffect(() => {
    let changed = false;
    const run = async () => {
      if (!userEmail) return;
      for (const task of tasks) {
        const prev = prevCompletedRef.current.get(task.id);
        if ((prev === false || prev === undefined) && task.completed === true) {
          const now = Date.now();
          const completionId = `complete:${task.id}`;
          const existing = await getNotificationById(completionId);
          if (existing?.deleted) {
            continue;
          }
          await upsertNotification({
            id: completionId,
            kind: "task_completed",
            taskId: task.id,
            taskText: task.text,
            userEmail,
            workspaceType: workspace,
            read: false,
            deleted: false,
            deletedAt: null,
            createdAt: now,
            updatedAt: now,
            syncStatus: "pending",
          });
          changed = true;
        }
      }
      prevCompletedRef.current.clear();
      for (const [id, completed] of completedById.entries()) {
        prevCompletedRef.current.set(id, completed);
      }
      if (changed) {
        await reloadCompletionNotifications();
      }
    };
    run();
  }, [tasks, completedById, userEmail, workspace, reloadCompletionNotifications]);

  const notifications = useMemo<BellNotification[]>(() => {
    const reminderList: BellNotification[] = Object.values(reminders)
      .filter((r) => r.notified)
      .map((r) => ({
        id: `reminder:${r.taskId}`,
        taskId: r.taskId,
        taskText: r.taskText,
        dueAt: r.dueAt,
        read: r.read,
        source: "reminder",
      }));

    const completionList: BellNotification[] = completionNotifications.map((n) => ({
      id: n.id,
      taskId: n.taskId,
      taskText: n.taskText,
      dueAt: n.updatedAt || n.createdAt,
      read: n.read,
      source: "completion",
    }));

    return [...completionList, ...reminderList].sort((a, b) => b.dueAt - a.dueAt);
  }, [reminders, completionNotifications]);

  const handleMarkAllRead = useCallback(() => {
    setReminders((prev) => {
      const next: Record<string, LocalReminder> = {};
      for (const [taskId, reminder] of Object.entries(prev)) {
        next[taskId] = reminder.notified ? { ...reminder, read: true } : reminder;
      }
      return next;
    });
    if (userEmail) {
      markAllNotificationsReadInIDB(userEmail, workspace).then(() => {
        reloadCompletionNotifications();
      });
      if (token) {
        apiMarkAllNotificationsRead(workspace, token).catch(() => {});
      }
    }
  }, [userEmail, workspace, reloadCompletionNotifications, token]);

  const handleDismissNotification = useCallback(
    async (n: BellNotification) => {
      if (n.source === "reminder") {
        setReminders((prev) => {
          const copy = { ...prev };
          delete copy[n.taskId];
          return copy;
        });
        return;
      }

      await softDeleteNotificationInIDB(n.id);
      await reloadCompletionNotifications();

      if (!userEmail) return;
      if (!token || !navigator.onLine) {
        await queueNotificationDelete(n.id, userEmail, workspace);
        return;
      }

      try {
        await apiDeleteNotification(n.id, token);
      } catch {
        await queueNotificationDelete(n.id, userEmail, workspace);
      }
    },
    [reloadCompletionNotifications, token, userEmail, workspace]
  );

  const getReminderLabel = useCallback(
    (taskId: string) => {
      const reminder = reminders[taskId];
      if (!reminder) return null;
      return new Date(reminder.dueAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    },
    [reminders]
  );

  const getReminderDueAt = useCallback(
    (taskId: string) => reminders[taskId]?.dueAt ?? null,
    [reminders]
  );

  const handleTaskReminderUpdate = useCallback(
    (taskId: string, taskText: string, dueAt: number | null) => {
      setReminders((prev) => {
        if (!dueAt) {
          const copy = { ...prev };
          delete copy[taskId];
          return copy;
        }
        return {
          ...prev,
          [taskId]: {
            taskId,
            taskText,
            dueAt,
            notified: dueAt <= Date.now(),
            read: dueAt > Date.now(),
          },
        };
      });
    },
    []
  );

  // ───────── RENDER ─────────
  return (
    <>
      {/* Ambient background orbs */}
      <div className="dash-orbs" aria-hidden="true">
        <div className="dash-orb dash-orb-1" />
        <div className="dash-orb dash-orb-2" />
        <div className="dash-orb dash-orb-3" />
      </div>

      <div className="dash-root">
        <div className="dash-inner">

          <HeaderSection
            workspace={workspace}
            setWorkspace={setWorkspace}
            userName={userName}
            theme={theme}
            toggleTheme={toggleTheme}
            logout={logout}
            notifications={notifications}
            onMarkAllRead={handleMarkAllRead}
            onDismissNotification={handleDismissNotification}
          />

          <StatsBar
            active={activeTasks.length}
            done={completedTasks.length}
            total={tasks.length}
          />

          <Archive tasks={tasks} onTasksChanged={reloadTasks} />

          {/* Search + Sort row */}
          <div className="w-[98%] ml-2 mb-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <SearchBar value={search} onChange={setSearch} />
              </div>
            </div>
          </div>

          {/* Task input bar */}
          {activeSectionId && !hasNoSections && (
            <InputSection
              ref={taskInputRef}
              input={input}
              setInput={setInput}
              imageFile={imageFile}
              setImageFile={setImageFile}
              reminderDate={reminderDate}
              setReminderDate={setReminderDate}
              reminderTime={reminderTime}
              setReminderTime={setReminderTime}
              handleAdd={actions.handleAdd}
              sectionName={activeSectionLabel ?? undefined}
            />
          )}

          {/* Board */}
          {loading ? (
            <KanbanSkeleton count={3} />
          ) : hasNoSections ? (
            <EmptyBoardState onCreateFirst={() => createSection("My Tasks")} />
          ) : (
            <KanbanBoard
              sections={sections}
              tasks={sortedTasks}
              onSectionsReorder={reorderSections}
              onCreateSection={createSection}
              onRenameSection={renameSection}
              onDeleteSection={deleteSection}
              onTasksChanged={reloadTasks}
              onTaskDelete={actions.handleDelete}
              onTaskToggle={toggleComplete}
              onTaskView={(t) => setViewTask(t)}
              onTaskAdd={actions.handleTaskAddInSection}
              getReminderLabel={getReminderLabel}
            />
          )}

        </div>
      </div>

      <ViewTaskDialog
        open={!!viewTask}
        onOpenChange={() => setViewTask(null)}
        task={viewTask}
        reminderDueAt={viewTask ? getReminderDueAt(viewTask.id) : null}
        onSave={async (id, text, image, removeImage, reminderAt = null) => {
          if (reminderAt !== null && reminderAt <= Date.now()) {
            toast.error("Reminder time should be in future");
            return false;
          }
          const ok = await actions.handleEditSave(id, text, image, removeImage);
          if (!ok) return false;
          handleTaskReminderUpdate(id, text, reminderAt);
          setViewTask(null);
          toast.success("Task updated");
          return true;
        }}
      />
    </>
  );
}
