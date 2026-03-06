import { Task }      from '../models/Task.model.js';
import { Workspace } from '../models/Workspace.model.js';

import {
  uploadImageToS3,
  deleteImageFromS3,
  resolveImageUrl,
} from '../s3/s3Service.js';
import { upsertTaskCompletedNotification } from './notifications.controller.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

// Attach signed URLs to an array of lean task objects
async function attachSignedUrls(tasks) {
  return Promise.all(tasks.map(t => resolveImageUrl(t, Task)));
}

function normalizeWorkspaceType(workspaceType) {
  return String(workspaceType ?? 'personal').trim().toLowerCase() || 'personal';
}

async function ensureWorkspace(userId, workspaceType) {
  const type = normalizeWorkspaceType(workspaceType);
  let workspace = await Workspace.findOne({ owner: userId, type }).lean();
  if (workspace) return workspace;

  try {
    workspace = await Workspace.create({
      workspaceId: crypto.randomUUID(),
      owner: userId,
      type,
      members: [userId],
    });
    return workspace.toObject();
  } catch (err) {
    if (err?.code !== 11000) throw err;
    return Workspace.findOne({ owner: userId, type }).lean();
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────
export const createTask = async (req, res) => {
  const { id, text, workspaceType, sectionId } = req.body;
  const { userId } = req.user;
  const normalizedWorkspaceType = normalizeWorkspaceType(workspaceType);

  const workspace = await ensureWorkspace(userId, normalizedWorkspaceType);
  if (!workspace) return res.status(404).json({ error: 'workspace not found' });

  const existing = await Task.findOne({ taskId: id }).lean();
  
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
        { image: imageKey, updatedAt: Date.now() },
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
    image:         imageKey,
    createdBy:     userId,
    workspaceType: normalizedWorkspaceType,
  });

  const taskObj  = task.toObject();
  const resolved = await resolveImageUrl(taskObj, Task);

  res.json({ status: 'ok', task: resolved });
};

// ─── Bulk Create ──────────────────────────────────────────────────────────────

export const bulkCreateTasks =async (req, res) => {
  const { tasks } = req.body;
  if (!tasks?.length) return res.json({ ok: true });

  const types = [...new Set(tasks.map(t => normalizeWorkspaceType(t.workspaceType)))];
  const { userId } = req.user;

  const workspaceMap = {};
  for (const type of types) {
    const ws = await ensureWorkspace(userId, type);
    if (ws) workspaceMap[type] = ws.workspaceId;
  }

  const docs = tasks.map(t => ({
    taskId:        t.id,
    workspaceId:   workspaceMap[normalizeWorkspaceType(t.workspaceType)],
    sectionId:     t.sectionId ?? null,
    text:          t.text,
    image:         t.image || null,   // bulk create accepts S3 keys only (no upload here)
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
  const { workspaceType } = req.query;
  const { userId } = req.user;
  const normalizedWorkspaceType = normalizeWorkspaceType(workspaceType);

  const ws = await ensureWorkspace(userId, normalizedWorkspaceType);
  if (!ws) return res.json([]);

  const tasks        = await Task.find({ workspaceId: ws.workspaceId, deleted: false }).lean();
  const tasksWithUrl = await attachSignedUrls(tasks);

  res.json(tasksWithUrl);
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateTask = async (req, res) => {
  const { id: taskId } = req.params;

  const task = await Task.findOne({ taskId });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const wasCompleted = task.completed;

  const { text, completed, archived, sectionId, removeImage } = req.body;

  if (text      !== undefined) task.text      = text;
  if (completed !== undefined) task.completed = completed;
  if (archived  !== undefined) task.archived  = archived;
  if (sectionId !== undefined) task.sectionId = sectionId;

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

  res.json({ status: 'ok', task: resolved });
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteTask =async (req, res) => {
  const task = await Task.findOne({ taskId: req.params.id }).select('image').lean();
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

  const bulkOps = updates.map(({ taskId, payload }) => ({
    updateOne: {
      filter: { taskId },
      update: { $set: { ...payload, updatedAt: Date.now() } },
    },
  }));

  const result = await Task.bulkWrite(bulkOps, { ordered: false });

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
    image: { $ne: null },
  }).select('image').lean();

  await Promise.allSettled(tasks.map(t => deleteImageFromS3(t.image)));

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
  res.json({ ok: true, deleted: result.modifiedCount });
};

// ─── Sync ─────────────────────────────────────────────────────────────────────

export const getWorkspaceId = async (req, res) => {
  const { workspaceType } = req.query;
  const { userId } = req.user;
  const normalizedWorkspaceType = normalizeWorkspaceType(workspaceType);

  const ws = await ensureWorkspace(userId, normalizedWorkspaceType);
  if (!ws) return res.status(404).json({ error: 'workspace not found' });

  res.json({ workspaceId: ws.workspaceId });
};

export const syncTasks = async (req, res) => {
  const { lastSyncedAt, workspaceId } = req.query;
  const since = lastSyncedAt ? Number(lastSyncedAt) : 0;

  const tasks        = await Task.find({ workspaceId, updatedAt: { $gt: since } }).lean();
  const tasksWithUrl = await attachSignedUrls(tasks);

  const mapped = tasksWithUrl.map(t => ({ ...t, id: t.taskId }));

  res.json({ tasks: mapped, syncedAt: Date.now() });
};
