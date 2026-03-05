import { Archive }   from '../models/Archive.model.js';
import { Task }      from '../models/Task.model.js';
import { Workspace } from '../models/Workspace.model.js';

export const bulkArchive = async (req, res) => {
  const { tasks } = req.body;
  const { userId } = req.user;

  if (!Array.isArray(tasks) || !tasks.length)//simple input validation
    return res.status(400).json({ error: 'tasks array required' });


const workspace = await Workspace.findOne({
  owner: userId,
  type: tasks[0]?.workspaceType ?? 'personal',
}).lean();

const docs = tasks.map(t => ({//preparing archive docs
  _id:              t.id,
  userId,
  workspaceId:      workspace?.workspaceId ?? 'unknown',
  encryptedPayload: t.encryptedPayload ?? null,
  archivedAt:       t.archivedAt ?? Date.now(),
  restoredAt:       null,
}));


  await Archive.insertMany(docs, { ordered: false }).catch(err => {
  if (err.code !== 11000) throw err;
});

  await Task.updateMany(
    { taskId: { $in: tasks.map(t => t.id) } },
    { $set: { archived: true, updatedAt: Date.now() } }
  );

  res.json({ ok: true });
};

export const getArchive = async (req, res) => {
  const { userId } = req.user;
  const tasks = await Archive.find({ userId, restoredAt: null }).lean();
  res.json({ tasks });
};

export const restoreOne = async (req, res) => {
  const { id } = req.params;

  await Archive.updateOne({ _id: id }, { $set: { restoredAt: Date.now() } });
  await Task.updateOne({ taskId: id }, { $set: { archived: false, updatedAt: Date.now() } });

  res.json({ ok: true });
};

export const restoreAll = async (req, res) => {
  const { userId } = req.user;

  const archived = await Archive.find({ userId, restoredAt: null }).lean();
  if (!archived.length) return res.json({ ok: true });

  await Archive.updateMany(
    { userId, restoredAt: null },
    { $set: { restoredAt: Date.now() } }
  );

  await Task.updateMany(
    { taskId: { $in: archived.map(a => a._id) } },
    { $set: { archived: false, updatedAt: Date.now() } }
  );

  res.json({ ok: true });
};