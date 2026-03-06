import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {getAllNotifications,getNotificationById,markAllNotificationsReadInIDB,softDeleteNotificationInIDB,upsertNotification,} from "@/infrastructure/lib/idb";
import type { AppNotification } from "@/shared/types/notification";
import type { Task } from "@/shared/types/task";
import { apiDeleteNotification, apiMarkAllNotificationsRead } from "@/services/notification.service";
import { queueNotificationDelete } from "@/hooks/taskQueueOps";
import { toast } from "sonner";

type LocalReminder = {
  taskId: string;
  taskText: string;
  dueAt: number;
  notified: boolean;
  read: boolean;
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
    () => `task-reminders:${userEmail ?? "guest"}:${workspace}`,
    [userEmail, workspace]
  );
  const [reminders, setReminders] = useState<Record<string, LocalReminder>>({});
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

  const setTaskReminder = useCallback((taskId: string, taskText: string, dueAt: number | null) => {
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
  }, []);

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

  return {
    notifications,
    reloadCompletionNotifications,
    handleMarkAllRead,
    handleDismissNotification,
    setTaskReminder,
    getReminderLabel,
    getReminderDueAt,
  };
}
