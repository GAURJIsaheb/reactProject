import { Task }      from '../models/Task.model.js';
import { Workspace } from '../models/Workspace.model.js';
import { asyncHandler } from '../TryCatch/async.js';

export const createTask = asyncHandler(async (req, res) => {
  const { id, text, image, workspaceType, sectionId } = req.body;
  const { userId } = req.user;

  const workspace = await Workspace.findOne({ owner: userId, type: workspaceType ?? 'personal' }).lean();
  if (!workspace) return res.status(404).json({ error: 'workspace not found' });

  const existing = await Task.exists({ taskId: id });
  if (existing) return res.json({ status: 'ok' });

  const task = await Task.create({
    taskId:        id,
    workspaceId:   workspace.workspaceId,
    sectionId:     sectionId ?? null,
    text,
    image:         image || null,
    createdBy:     userId,
    workspaceType: workspaceType ?? 'personal',
  });

  res.json({ status: 'ok', task });
});

export const bulkCreateTasks = asyncHandler(async (req, res) => {
  const { tasks } = req.body;
  if (!tasks?.length) return res.json({ ok: true });

  const types = [...new Set(tasks.map(t => t.workspaceType ?? 'personal'))];
  const { userId } = req.user;

  const workspaceMap = {};
  for (const type of types) {
    const ws = await Workspace.findOne({ owner: userId, type }).lean();
    if (ws) workspaceMap[type] = ws.workspaceId;
  }

  const docs = tasks.map(t => ({
    taskId:        t.id,
    workspaceId:   workspaceMap[t.workspaceType ?? 'personal'],
    sectionId:     t.sectionId ?? null,
    text:          t.text,
    image:         t.image || null,
    completed:     t.completed  ?? false,
    archived:      t.archived   ?? false,
    deleted:       t.deleted    ?? false,
    createdBy:     userId,
    workspaceType: t.workspaceType ?? 'personal',
    createdAt:     t.createdAt  ?? Date.now(),
    updatedAt:     t.updatedAt  ?? Date.now(),
    version:       1,
  }));

  await Task.insertMany(docs, { ordered: false }).catch(err => {
    if (err.code !== 11000) throw err;
  });

  res.json({ ok: true, inserted: docs.length });
});

export const getAllTasks = asyncHandler(async (req, res) => {
  const { workspaceType } = req.query;
  const { userId } = req.user;

  const ws = await Workspace.findOne({ owner: userId, type: workspaceType ?? 'personal' }).lean();
  if (!ws) return res.json([]);

  const tasks = await Task.find({ workspaceId: ws.workspaceId, deleted: false }).lean();
  res.json(tasks);
});

export const updateTask = asyncHandler(async (req, res) => {
  const { id: taskId } = req.params;
  const { text, completed, archived, image, sectionId } = req.body;

  const task = await Task.findOne({ taskId });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (text       !== undefined) task.text       = text;
  if (image      !== undefined) task.image      = image;
  if (completed  !== undefined) task.completed  = completed;
  if (archived   !== undefined) task.archived   = archived;
  if (sectionId  !== undefined) task.sectionId  = sectionId;
  task.updatedAt = Date.now();
  task.version  += 1;

  await task.save();
  res.json({ status: 'ok' });
});

export const bulkUpdateTasks = asyncHandler(async (req, res) => {
  const { updates } = req.body;
  if (!updates?.length) return res.json({ ok: true });

  const bulkOps = updates.map(({ taskId, payload }) => ({
    updateOne: {
      filter: { taskId },
      update: { $set: { ...payload, updatedAt: Date.now() } },
    },
  }));

  const result = await Task.bulkWrite(bulkOps, { ordered: false });
  res.json({ ok: true, modified: result.modifiedCount });
});

// ─── Soft delete — stamps deletedAt so the cron can hard-delete after 30 days ─
export const deleteTask = asyncHandler(async (req, res) => {
  await Task.updateOne(
    { taskId: req.params.id },
    { $set: { deleted: true, deletedAt: Date.now(), updatedAt: Date.now() } }
  );
  res.json({ status: 'ok' });
});

export const bulkDeleteTasks = asyncHandler(async (req, res) => {
  const { taskIds } = req.body;
  if (!taskIds?.length) return res.json({ ok: true });

  const now = Date.now();
  const result = await Task.updateMany(
    { taskId: { $in: taskIds } },
    { $set: { deleted: true, deletedAt: now, updatedAt: now } }
  );
  res.json({ ok: true, deleted: result.modifiedCount });
});

// ─── Sync ─────────────────────────────────────────────────────────────────────

export const getWorkspaceId = asyncHandler(async (req, res) => {
  const { workspaceType } = req.query;
  const { userId } = req.user;

  const ws = await Workspace.findOne({
    owner: userId,
    type:  workspaceType ?? 'personal',
  }).lean();

  if (!ws) return res.status(404).json({ error: 'workspace not found' });

  res.json({ workspaceId: ws.workspaceId });
});

export const syncTasks = asyncHandler(async (req, res) => {
  const { lastSyncedAt, workspaceId } = req.query;
  const since = lastSyncedAt ? Number(lastSyncedAt) : 0;

  const tasks = await Task.find({
    workspaceId,
    updatedAt: { $gt: since },
  }).lean();

  const mapped = tasks.map((t) => ({
    ...t,
    id: t.taskId,
  }));

  res.json({
    tasks: mapped,
    syncedAt: Date.now(),
  });
});