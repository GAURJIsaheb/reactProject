import { db } from '../mongo/mongo.js';
import { asyncHandler } from '../TryCatch/async.js';

export const bulkCreateTasks = asyncHandler(async (req, res) => {
  const { tasks } = req.body;
  if (!tasks?.length) return res.json({ ok: true });

  const col = db.collection('tasks');
  const docs = tasks.map(t => {
    const workspaceId = t.workspaceType === 'professional'
      ? 'pro_' + t.userEmail
      : 'personal_' + t.userEmail;
    return {
      taskId:        t.id,
      workspaceId,
      text:          t.text,
      image:         t.image || null,
      completed:     t.completed  ?? false,
      archived:      t.archived   ?? false,
      deleted:       t.deleted    ?? false,
      createdBy:     t.userEmail,
      workspaceType: t.workspaceType,
      createdAt:     t.createdAt  ?? Date.now(),
      updatedAt:     t.updatedAt  ?? Date.now(),
      version: 1
    };
  });

  await col.insertMany(docs, { ordered: false }).catch(err => {
    if (err.code !== 11000 && err.writeErrors?.some(e => e.code !== 11000)) throw err;
  });

  res.json({ ok: true, inserted: docs.length });
});

export const createTask = asyncHandler(async (req, res) => {
  const { id, text, image, workspaceType } = req.body;
  const { userId } = req.user;

  if (!id || !userId)
    return res.status(400).json({ error: 'missing fields' });

  const workspace = await db.collection('workspaces').findOne({
    owner: userId,
    type: workspaceType ?? 'personal'
  });
  if (!workspace) return res.status(404).json({ error: 'workspace not found' });

  const col = db.collection('tasks');
  const exists = await col.findOne({ taskId: id });
  if (exists) return res.json({ status: 'ok' });

  const newTask = {
    taskId: id,
    workspaceId: workspace.workspaceId,
    text,
    image: image || null,
    completed: false,
    archived: false,
    deleted: false,
    createdBy: userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1
  };

  await col.insertOne(newTask);
  res.json({ status: 'ok', task: newTask });
});

export const getAllTasks = asyncHandler(async (req, res) => {
  const { workspaceType } = req.query;
  const { userId } = req.user;

  const ws = await db.collection('workspaces').findOne({
    owner: userId,
    type: workspaceType ?? 'personal'
  });
  if (!ws) return res.json([]);

  const tasks = await db.collection('tasks')
    .find({ workspaceId: ws.workspaceId, deleted: false })
    .toArray();

  res.json(tasks);
});

export const bulkUpdateTasks = asyncHandler(async (req, res) => {
  const { updates } = req.body;
  if (!updates?.length) return res.json({ ok: true });

  const bulkOps = updates.map(({ taskId, payload }) => ({
    updateOne: {
      filter: { taskId },
      update: { $set: { ...payload, updatedAt: Date.now() } }
    }
  }));

  const result = await db.collection('tasks').bulkWrite(bulkOps, { ordered: false });
  res.json({ ok: true, modified: result.modifiedCount });
});

export const updateTask = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const { text, completed, archived, image } = req.body;

  const col = db.collection('tasks');
  const task = await col.findOne({ taskId });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  await col.updateOne({ taskId }, {
    $set: {
      text:      text      ?? task.text,
      image:     image     ?? task.image,
      completed: completed ?? task.completed,
      archived:  archived  ?? task.archived,
      updatedAt: Date.now(),
      version:   (task.version || 1) + 1
    }
  });

  res.json({ status: 'ok' });
});

export const bulkDeleteTasks = asyncHandler(async (req, res) => {
  const { taskIds } = req.body;
  if (!taskIds?.length) return res.json({ ok: true });

  const result = await db.collection('tasks').updateMany(
    { taskId: { $in: taskIds } },
    { $set: { deleted: true, updatedAt: Date.now() } }
  );

  res.json({ ok: true, deleted: result.modifiedCount });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const taskId = req.params.id;

  await db.collection('tasks').updateOne(
    { taskId },
    { $set: { deleted: true, updatedAt: Date.now() } }
  );

  res.json({ status: 'ok' });
});