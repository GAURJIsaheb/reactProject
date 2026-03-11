import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAllNotifications,
  getNotificationById,
  markAllNotificationsReadInIDB,
  softDeleteNotificationInIDB,
  upsertNotification,
} from "@/infrastructure/lib/idb";
import type { AppNotification } from "@/shared/types/notification";
import type { Task } from "@/shared/types/task";
import { apiDeleteNotification, apiMarkAllNotificationsRead } from "@/services/notification.service";
import { queueNotificationDelete } from "@/hooks/taskQueueOps";
import { toast } from "sonner";

type ReminderMeta = {
  read: boolean;
  dismissed: boolean;
  notified: boolean;
};

export type BellNotification = {
  id: string;
  taskId: string;
  taskText: string;
  dueAt: number;
  read: boolean;
  source: "reminder" | "completion";
};

type UseDashboardNotificationsArgs = {
  tasks: Task[];
  workspace: string;
  userEmail: string | null;
  token: string | null;
};

export function useDashboardNotifications({
  tasks,
  workspace,
  userEmail,
  token,
}: UseDashboardNotificationsArgs) {
  const reminderStorageKey = useMemo(
    () => `task-reminder-meta:${userEmail ?? "guest"}:${workspace}`,
    [userEmail, workspace]
  );
  const [reminderMeta, setReminderMeta] = useState<Record<string, ReminderMeta>>({});
  const [completionNotifications, setCompletionNotifications] = useState<AppNotification[]>([]);

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
      setReminderMeta(raw ? JSON.parse(raw) : {});
    } catch {
      setReminderMeta({});
    }
  }, [reminderStorageKey]);

  useEffect(() => {
    localStorage.setItem(reminderStorageKey, JSON.stringify(reminderMeta));
  }, [reminderMeta, reminderStorageKey]);

  useEffect(() => {
    const activeReminderIds = new Set(
      tasks.filter((task) => typeof task.reminderAt === "number").map((task) => task.id)
    );

    setReminderMeta((prev) => {
      let changed = false;
      const next: Record<string, ReminderMeta> = {};
      for (const [taskId, meta] of Object.entries(prev)) {
        if (activeReminderIds.has(taskId)) next[taskId] = meta;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [tasks]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setReminderMeta((prev) => {
        let changed = false;
        const next = { ...prev };

        for (const task of tasks) {
          if (typeof task.reminderAt !== "number") continue;
          const current = next[task.id] ?? {
            read: task.reminderAt > now,
            dismissed: false,
            notified: false,
          };

          if (!current.notified && task.reminderAt <= now) {
            next[task.id] = { ...current, notified: true, read: false, dismissed: false };
            changed = true;
            toast("Reminder due", {
              description: task.text,
              duration: 4000,
            });
          }
        }

        return changed ? next : prev;
      });
    }, 15000);

    return () => window.clearInterval(timer);
  }, [tasks]);

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
          if (existing?.deleted) continue;

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

      if (changed) await reloadCompletionNotifications();
    };
    run();
  }, [tasks, completedById, userEmail, workspace, reloadCompletionNotifications]);

  const reminderNotifications = useMemo<BellNotification[]>(() => {
    const now = Date.now();

    return tasks
      .filter((task) => typeof task.reminderAt === "number")
      .map((task) => {
        const dueAt = task.reminderAt as number;
        const meta = reminderMeta[task.id];
        const notified = meta?.notified ?? dueAt <= now;
        const read = meta?.read ?? dueAt > now;
        const dismissed = meta?.dismissed ?? false;
        return { task, dueAt, notified, read, dismissed };
      })
      .filter((entry) => entry.notified && !entry.dismissed)
      .map((entry) => ({
        id: `reminder:${entry.task.id}`,
        taskId: entry.task.id,
        taskText: entry.task.text,
        dueAt: entry.dueAt,
        read: entry.read,
        source: "reminder" as const,
      }));
  }, [tasks, reminderMeta]);

  const notifications = useMemo<BellNotification[]>(() => {
    const completionList: BellNotification[] = completionNotifications.map((n) => ({
      id: n.id,
      taskId: n.taskId,
      taskText: n.taskText,
      dueAt: n.updatedAt || n.createdAt,
      read: n.read,
      source: "completion",
    }));

    return [...completionList, ...reminderNotifications].sort((a, b) => b.dueAt - a.dueAt);
  }, [completionNotifications, reminderNotifications]);

  const handleMarkAllRead = useCallback(() => {
    const now = Date.now();
    setReminderMeta((prev) => {
      const next: Record<string, ReminderMeta> = { ...prev };
      for (const task of tasks) {
        if (typeof task.reminderAt !== "number" || task.reminderAt > now) continue;
        next[task.id] = {
          read: true,
          dismissed: false,
          notified: true,
        };
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
  }, [tasks, userEmail, workspace, reloadCompletionNotifications, token]);

  const handleDismissNotification = useCallback(
    async (n: BellNotification) => {
      if (n.source === "reminder") {
        setReminderMeta((prev) => ({
          ...prev,
          [n.taskId]: {
            read: true,
            dismissed: true,
            notified: true,
          },
        }));
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
      const task = tasks.find((item) => item.id === taskId);
      if (typeof task?.reminderAt !== "number") return null;
      return new Date(task.reminderAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    },
    [tasks]
  );

  const getReminderDueAt = useCallback(
    (taskId: string) => tasks.find((task) => task.id === taskId)?.reminderAt ?? null,
    [tasks]
  );

  return {
    notifications,
    reloadCompletionNotifications,
    handleMarkAllRead,
    handleDismissNotification,
    getReminderLabel,
    getReminderDueAt,
  };
}
