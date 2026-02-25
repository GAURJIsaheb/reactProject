import { db } from '../mongo/mongo.js';
import { asyncHandler } from '../TryCatch/async.js';

export const bulkArchive = asyncHandler(async (req, res) => {
  const { tasks } = req.body;
  const { userId } = req.user;

  if (!Array.isArray(tasks) || tasks.length === 0)
    return res.status(400).json({ error: 'tasks array required' });

  const workspace = await db.collection('workspaces').findOne({
    owner: userId,
    type: tasks[0]?.workspaceType ?? 'personal'
  });

  const col = db.collection('archive');
  const docs = tasks.map(t => ({
    _id:              t.id,
    userId,
    workspaceId:      workspace?.workspaceId,
    encryptedPayload: t.encryptedPayload,
    archivedAt:       t.archivedAt,
    restoredAt:       null,
  }));

  await col.insertMany(docs, { ordered: false }).catch(err => {
    if (err.code !== 11000 && err.writeErrors?.some(e => e.code !== 11000)) throw err;
  });

  const taskIds = tasks.map(t => t.id);
  await db.collection('tasks').updateMany(
    { taskId: { $in: taskIds } },
    { $set: { archived: true, updatedAt: Date.now() } }
  );

  res.json({ ok: true });
});

export const restoreAll = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const archived = await db.collection('archive')
    .find({ userId, restoredAt: null })
    .toArray();

  await db.collection('archive').updateMany(
    { userId, restoredAt: null },
    { $set: { restoredAt: Date.now() } }
  );

  const taskIds = archived.map(a => a._id);
  if (taskIds.length > 0) {
    await db.collection('tasks').updateMany(
      { taskId: { $in: taskIds } },
      { $set: { archived: false, updatedAt: Date.now() } }
    );
  }

  res.json({ ok: true });
});

export const restoreOne = asyncHandler(async (req, res) => {
  const id = req.params.id;

  await db.collection('archive').updateOne(
    { _id: id },
    { $set: { restoredAt: Date.now() } }
  );

  await db.collection('tasks').updateOne(
    { taskId: id },
    { $set: { archived: false, updatedAt: Date.now() } }
  );

  res.json({ ok: true });
});

export const getArchive = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const tasks = await db.collection('archive')
    .find({ userId, restoredAt: null })
    .toArray();

  res.json({ tasks });
});