import { Task }      from '../models/Task.model.js';
import { Workspace } from '../models/Workspace.model.js';

import {
  uploadImageToS3,
  deleteImageFromS3,
  resolveImageUrl,
} from '../s3/s3Service.js';
import { upsertTaskCompletedNotification } from './notifications.controller.js';
import { getDefaultWorkspaceEmoji, normalizeWorkspaceType } from '../utils/workspaceDefaults.js';
import { TASK_PUBLIC_PROJECTION } from '../utils/taskProjection.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

// Attach signed URLs to an array of lean task objects
function normalizeReminderAt(reminderAt) {
  if (reminderAt === undefined || reminderAt === null || reminderAt === '') return null;
  const parsed = Number(reminderAt);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLabels(labels) {
  let raw = labels;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    try {
      raw = JSON.parse(trimmed);
    } catch {
      raw = trimmed.split(',');
    }
  }

  if (!Array.isArray(raw)) return [];

  const seen = new Set();
  const normalized = [];

  for (const value of raw) {
    const label = String(value ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 24);

    if (!label) continue;

    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(label);

    if (normalized.length === 3) break;
  }

  return normalized;
}

async function ensureWorkspace(userId, workspaceType) {
  const type = normalizeWorkspaceType(workspaceType);
  let workspace = await Workspace.findOne(
    { owner: userId, type, deleted: false },
    { _id: 0, workspaceId: 1, type: 1 }
  ).lean();
  if (workspace) return workspace;

  try {
    workspace = await Workspace.create({
      workspaceId: crypto.randomUUID(),
      owner: userId,
      type,
      emoji: getDefaultWorkspaceEmoji(type),
      members: [userId],
    });
    return workspace.toObject();
  } catch (err) {
    if (err?.code !== 11000) throw err;
    return Workspace.findOne(
      { owner: userId, type, deleted: false },
      { _id: 0, workspaceId: 1, type: 1 }
    ).lean();
  }
}

async function resolveWorkspace(userId, workspaceType, workspaceId) {
  if (workspaceId) {
    return Workspace.findOne(
      {
        workspaceId,
        deleted: false,
        $or: [{ owner: userId }, { members: userId }],
      },
      { _id: 0, workspaceId: 1, type: 1 }
    ).lean();
  }

  return ensureWorkspace(userId, workspaceType);
}

async function broadcastTaskState(req, type, taskOrTasks) {
  const wsServer = req.app.get('wsServer');
  if (!wsServer) return;

  const tasks = Array.isArray(taskOrTasks) ? taskOrTasks : [taskOrTasks];
  for (const task of tasks) {
    if (!task?.workspaceId) continue;
    wsServer.broadcastToWorkspace(task.workspaceId, {
      type,
      workspaceId: task.workspaceId,
      ...(type === 'TASK_DELETE'
        ? { taskId: task.taskId ?? task.id }
        : { task: { ...task, id: task.taskId ?? task.id } }),
    });
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────
export const createTask = async (req, res) => {
  const { id, text, workspaceType, workspaceId, sectionId, reminderAt, labels } = req.body;
  const { userId } = req.user;
  const normalizedWorkspaceType = normalizeWorkspaceType(workspaceType);
  const normalizedReminderAt = normalizeReminderAt(reminderAt);
  const normalizedLabels = normalizeLabels(labels);

  const workspace = await resolveWorkspace(userId, normalizedWorkspaceType, workspaceId);
  if (!workspace) return res.status(404).json({ error: 'workspace not found' });

  const existing = await Task.findOne(
    { taskId: id },
    { _id: 0, taskId: 1, image: 1, labels: 1, reminderAt: 1 }
  ).lean();
  
  //Task created earlier without image → image arrives later.  — UPDATE 
  if (existing) {
    if (req.file && !existing.image) {
      console.log('🔄 Task exists but no image — updating with image');
      let imageKey = null;
      try {
        imageKey = await uploadImageToS3(req.file.buffer, req.file.mimetype, userId);
        console.log('✅ S3 upload success, key:', imageKey);
      } catch(err) {
        console.error('❌ S3 upload failed:', err);
        return res.status(500).json({ error: 'S3 upload failed' });
      }

      const updated = await Task.findOneAndUpdate(
        { taskId: id },
        {
          image: imageKey,
          reminderAt: normalizedReminderAt ?? existing.reminderAt ?? null,
          labels: normalizedLabels.length ? normalizedLabels : existing.labels ?? [],
          updatedAt: Date.now(),
        },
        { new: true }
      ).lean();

      const resolved = await resolveImageUrl(updated, Task);
      return res.json({ status: 'ok', task: resolved });
    }

    // Task + image exist — skip
    return res.json({ status: 'ok' });
  }

  // New task — normal flow
  let imageKey = null;
  if (req.file) {
    try {
      imageKey = await uploadImageToS3(req.file.buffer, req.file.mimetype, userId);
      console.log('✅ S3 upload success, key:', imageKey);
    } catch(err) {
      console.error('❌ S3 upload failed:', err);
      return res.status(500).json({ error: 'S3 upload failed' });
    }
  }

  const task = await Task.create({
    taskId:        id,
    workspaceId:   workspace.workspaceId,
    sectionId:     sectionId ?? null,
    text,
    labels:        normalizedLabels,
    image:         imageKey,
    reminderAt:    normalizedReminderAt,
    createdBy:     userId,
    workspaceType: normalizedWorkspaceType,
  });

  const taskObj  = task.toObject();
  const resolved = await resolveImageUrl(taskObj, Task);

  await broadcastTaskState(req, 'TASK_CREATE', resolved);

  res.json({ status: 'ok', task: resolved });
};

// ─── Bulk Create ──────────────────────────────────────────────────────────────

export const bulkCreateTasks =async (req, res) => {
  const { tasks } = req.body;
  if (!tasks?.length) return res.json({ ok: true });

  const types = [...new Set(tasks.map(t => normalizeWorkspaceType(t.workspaceType)))];
  const explicitWorkspaceIds = [...new Set(tasks.map((t) => t.workspaceId).filter(Boolean))];
  const { userId } = req.user;

  const workspaceMap = {};
  for (const type of types) {
    const ws = await ensureWorkspace(userId, type);
    if (ws) workspaceMap[type] = ws.workspaceId;
  }

  const allowedWorkspaceIds = new Set();
  for (const id of explicitWorkspaceIds) {
    const ws = await resolveWorkspace(userId, 'personal', id);
    if (ws) allowedWorkspaceIds.add(ws.workspaceId);
  }

  const docs = tasks.map(t => ({
    taskId:        t.id,
    workspaceId:   allowedWorkspaceIds.has(t.workspaceId)
      ? t.workspaceId
      : workspaceMap[normalizeWorkspaceType(t.workspaceType)],
    sectionId:     t.sectionId ?? null,
    text:          t.text,
    labels:        normalizeLabels(t.labels),
    image:         t.image || null,   // bulk create accepts S3 keys only (no upload here)
    reminderAt:    normalizeReminderAt(t.reminderAt),
    completed:     t.completed  ?? false,
    archived:      t.archived   ?? false,
    deleted:       t.deleted    ?? false,
    createdBy:     userId,
    workspaceType: normalizeWorkspaceType(t.workspaceType),
    createdAt:     t.createdAt  ?? Date.now(),
    updatedAt:     t.updatedAt  ?? Date.now(),
    version:       1,
  }));

  await Task.insertMany(docs, { ordered: false }).catch(err => {
    if (err.code !== 11000) throw err;
  });

  res.json({ ok: true, inserted: docs.length });
};

// ─── Get All ──────────────────────────────────────────────────────────────────

export const getAllTasks = async (req, res) => {
  const { workspaceType, workspaceId } = req.query;
  const { userId } = req.user;
  const normalizedWorkspaceType = normalizeWorkspaceType(workspaceType);

  const ws = await resolveWorkspace(userId, normalizedWorkspaceType, workspaceId);
  if (!ws) return res.json([]);

  const tasks = await Task.find(
    { workspaceId: ws.workspaceId, deleted: false },
    TASK_PUBLIC_PROJECTION
  ).lean();

  res.json(tasks);
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateTask = async (req, res) => {
  const { id: taskId } = req.params;

  const task = await Task.findOne({ taskId }).select(
    'taskId text labels completed archived sectionId reminderAt image imageUrl imageUrlExpiry createdBy workspaceType workspaceId version'
  );
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const wasCompleted = task.completed;

  const { text, completed, archived, sectionId, removeImage, reminderAt, labels } = req.body;

  if (text      !== undefined) task.text      = text;
  if (labels    !== undefined) task.labels    = normalizeLabels(labels);
  if (completed !== undefined) task.completed = completed;
  if (archived  !== undefined) task.archived  = archived;
  if (sectionId !== undefined) task.sectionId = sectionId;
  if (reminderAt !== undefined) task.reminderAt = normalizeReminderAt(reminderAt);

  // New image uploaded
  if (req.file) {
    if (task.image) await deleteImageFromS3(task.image);
    task.image         = await uploadImageToS3(req.file.buffer, req.file.mimetype, task.createdBy);
    task.imageUrl      = null;
    task.imageUrlExpiry= null;
  }

  // Frontend asked to remove image
  if (removeImage === 'true' || removeImage === true) {
    if (task.image) await deleteImageFromS3(task.image);
    task.image         = null;
    task.imageUrl      = null;
    task.imageUrlExpiry= null;
  }

  task.updatedAt = Date.now();
  task.version  += 1;

  await task.save();

  if (!wasCompleted && task.completed) {
    await upsertTaskCompletedNotification({
      taskId: task.taskId,
      taskText: task.text,
      userId: task.createdBy,
      workspaceType: task.workspaceType,
    });
  }

  const taskObj  = task.toObject();
  const resolved = await resolveImageUrl(taskObj, Task);

  await broadcastTaskState(req, 'TASK_UPDATE', resolved);

  res.json({ status: 'ok', task: resolved });
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteTask =async (req, res) => {
  const task = await Task.findOne({ taskId: req.params.id }).select('taskId workspaceId image').lean();
  if (task?.image) {
    await deleteImageFromS3(task.image);
  }

  await Task.updateOne(
    { taskId: req.params.id },
    {
      $set: {
        deleted: true,
        deletedAt: Date.now(),
        updatedAt: Date.now(),
        image: null,
        imageUrl: null,
        imageUrlExpiry: null,
      },
    }
  );
  await broadcastTaskState(req, 'TASK_DELETE', task);
  res.json({ status: 'ok' });
};

// ─── Bulk Update ──────────────────────────────────────────────────────────────

export const bulkUpdateTasks = async (req, res) => {
  const { updates } = req.body;
  if (!updates?.length) return res.json({ ok: true });

  const completionTargets = updates
    .filter((u) => u?.payload?.completed === true)
    .map((u) => u.taskId);

  const toNotify = completionTargets.length
    ? await Task.find({
        taskId: { $in: completionTargets },
        completed: false,
      }).select('taskId text createdBy workspaceType').lean()
    : [];

  const bulkOps = updates.map(({ taskId, payload }) => {
    const normalizedPayload = { ...payload };
    if (Object.prototype.hasOwnProperty.call(payload ?? {}, 'labels')) {
      normalizedPayload.labels = normalizeLabels(payload.labels);
    }

    return {
      updateOne: {
        filter: { taskId },
        update: { $set: { ...normalizedPayload, updatedAt: Date.now() } },
      },
    };
  });

  const result = await Task.bulkWrite(bulkOps, { ordered: false });

  const updatedTasks = await Task.find(
    { taskId: { $in: updates.map((u) => u.taskId) } },
    TASK_PUBLIC_PROJECTION
  ).lean();
  await broadcastTaskState(req, 'TASK_UPDATE', updatedTasks);

  if (toNotify.length > 0) {
    await Promise.allSettled(
      toNotify.map((t) =>
        upsertTaskCompletedNotification({
          taskId: t.taskId,
          taskText: t.text,
          userId: t.createdBy,
          workspaceType: t.workspaceType,
        })
      )
    );
  }

  res.json({ ok: true, modified: result.modifiedCount });
};

// ─── Bulk Delete ───────────────────────────────────────────────────────────────────

export const bulkDeleteTasks =async (req, res) => {
  const { taskIds } = req.body;
  if (!taskIds?.length) return res.json({ ok: true });

  const tasks = await Task.find({
    taskId: { $in: taskIds },
  }).select('taskId workspaceId image').lean();

  await Promise.allSettled(tasks.filter((t) => t.image).map(t => deleteImageFromS3(t.image)));

  const now    = Date.now();
  const result = await Task.updateMany(
    { taskId: { $in: taskIds } },
    {
      $set: {
        deleted: true,
        deletedAt: now,
        updatedAt: now,
        image: null,
        imageUrl: null,
        imageUrlExpiry: null,
      },
    }
  );
  await broadcastTaskState(req, 'TASK_DELETE', tasks);
  res.json({ ok: true, deleted: result.modifiedCount });
};

// ─── Sync ─────────────────────────────────────────────────────────────────────

export const getWorkspaceId = async (req, res) => {
  const { workspaceType, workspaceId } = req.query;
  const { userId } = req.user;
  const normalizedWorkspaceType = normalizeWorkspaceType(workspaceType);

  const ws = await resolveWorkspace(userId, normalizedWorkspaceType, workspaceId);
  if (!ws) return res.status(404).json({ error: 'workspace not found' });

  res.json({ workspaceId: ws.workspaceId });
};

export const getTaskImageUrl = async (req, res) => {
  const { id: taskId } = req.params;
  const { userId } = req.user;

  const task = await Task.findOne(
    { taskId, createdBy: userId, deleted: false },
    { _id: 0, taskId: 1, image: 1, imageUrl: 1, imageUrlExpiry: 1 }
  ).lean();

  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!task.image) return res.json({ imageUrl: null, imageUrlExpiry: null });

  const resolved = await resolveImageUrl(task, Task);
  return res.json({
    imageUrl: resolved.imageUrl ?? null,
    imageUrlExpiry: resolved.imageUrlExpiry ?? null,
  });
};

export const syncTasks = async (req, res) => {
  const { lastSyncedAt, workspaceId } = req.query;
  const since = lastSyncedAt ? Number(lastSyncedAt) : 0;

  const tasks = await Task.find(
    { workspaceId, updatedAt: { $gt: since } },
    TASK_PUBLIC_PROJECTION
  ).lean();

  const mapped = tasks.map(t => ({ ...t, id: t.taskId }));

  res.json({ tasks: mapped, syncedAt: Date.now() });
};
