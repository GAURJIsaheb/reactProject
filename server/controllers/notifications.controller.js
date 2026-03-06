import { Notification } from "../models/Notification.model.js";

export async function syncNotifications(req, res) {
  const { workspaceType = "personal", lastSyncedAt } = req.query;
  const { userId } = req.user;
  const since = lastSyncedAt ? Number(lastSyncedAt) : 0;

  const notifications = await Notification.find({
    createdBy: userId,
    workspaceType,
    updatedAt: { $gt: since },
  }).lean();

  const mapped = notifications.map((n) => ({
    id: n.notificationId,
    kind: n.kind,
    taskId: n.taskId,
    taskText: n.taskText,
    read: n.read,
    deleted: n.deleted,
    deletedAt: n.deletedAt ?? null,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }));

  res.json({ notifications: mapped, syncedAt: Date.now() });
}

export async function deleteNotification(req, res) {
  const { id } = req.params;
  const { userId } = req.user;
  const now = Date.now();

  await Notification.updateOne(
    { notificationId: id, createdBy: userId },
    {
      $set: {
        deleted: true,
        deletedAt: now,
        updatedAt: now,
      },
    }
  );

  res.json({ ok: true });
}

export async function bulkDeleteNotifications(req, res) {
  const { notificationIds } = req.body;
  const { userId } = req.user;
  if (!notificationIds?.length) return res.json({ ok: true, deleted: 0 });

  const now = Date.now();
  const result = await Notification.updateMany(
    { notificationId: { $in: notificationIds }, createdBy: userId },
    {
      $set: {
        deleted: true,
        deletedAt: now,
        updatedAt: now,
      },
    }
  );

  res.json({ ok: true, deleted: result.modifiedCount ?? 0 });
}

export async function markAllRead(req, res) {
  const { workspaceType = "personal" } = req.body;
  const { userId } = req.user;

  await Notification.updateMany(
    { createdBy: userId, workspaceType, deleted: false, read: false },
    { $set: { read: true, updatedAt: Date.now() } }
  );

  res.json({ ok: true });
}

export async function upsertTaskCompletedNotification({
  taskId,
  taskText,
  userId,
  workspaceType,
}) {
  const now = Date.now();
  const notificationId = `complete:${taskId}`;

  await Notification.updateOne(
    { notificationId, createdBy: userId },
    {
      $set: {
        taskId,
        taskText,
        kind: "task_completed",
        workspaceType,
        read: false,
        deleted: false,
        deletedAt: null,
        updatedAt: now,
      },
      $setOnInsert: {
        notificationId,
        createdBy: userId,
        createdAt: now,
      },
    },
    { upsert: true }
  );
}
