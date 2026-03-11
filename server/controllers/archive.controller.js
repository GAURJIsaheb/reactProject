import { Archive }   from '../models/Archive.model.js';
import { Task }      from '../models/Task.model.js';
import { Workspace } from '../models/Workspace.model.js';

function normalizeWorkspaceType(workspaceType) {
  return String(workspaceType ?? 'personal').trim().toLowerCase() || 'personal';
}

async function resolveArchiveWorkspace(userId, workspaceId, workspaceType) {
  if (workspaceId) {
    return Workspace.findOne({
      workspaceId,
      deleted: false,
      $or: [{ owner: userId }, { members: userId }],
    }).lean();
  }

  return Workspace.findOne({
    owner: userId,
    type: normalizeWorkspaceType(workspaceType),
    deleted: false,
  }).lean();
}

async function broadcastTaskUpdates(req, workspaceId, taskIds) {
  if (!workspaceId || !taskIds.length) return;
  const updatedTasks = await Task.find(
    { taskId: { $in: taskIds } },
    {
      _id: 0,
      taskId: 1,
      workspaceId: 1,
      sectionId: 1,
      text: 1,
      labels: 1,
      image: 1,
      imageUrl: 1,
      imageUrlExpiry: 1,
      reminderAt: 1,
      completed: 1,
      archived: 1,
      deleted: 1,
      deletedAt: 1,
      createdBy: 1,
      workspaceType: 1,
      version: 1,
      createdAt: 1,
      updatedAt: 1,
    }
  ).lean();

  const wsServer = req.app.get('wsServer');
  for (const task of updatedTasks) {
    wsServer?.broadcastToWorkspace(workspaceId, {
      type: 'TASK_UPDATE',
      workspaceId,
      task: { ...task, id: task.taskId },
    });
  }
}

export const bulkArchive = async (req, res) => {
  const { tasks } = req.body;
  const { userId } = req.user;

  if (!Array.isArray(tasks) || !tasks.length)//simple input validation
    return res.status(400).json({ error: 'tasks array required' });

  const workspace = await resolveArchiveWorkspace(
    userId,
    tasks[0]?.workspaceId,
    tasks[0]?.workspaceType
  );
  if (!workspace) return res.status(404).json({ error: 'workspace not found' });

  const now = Date.now();
  const docs = tasks.map(t => ({//preparing archive docs
    _id:              t.id,
    userId,
    workspaceId:      workspace.workspaceId,
    encryptedPayload: t.encryptedPayload ?? null,
    archivedAt:       t.archivedAt ?? now,
    restoredAt:       null,
  }));

  await Archive.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: doc },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  await Task.updateMany(
    { taskId: { $in: tasks.map(t => t.id) } },
    { $set: { archived: true, updatedAt: now } }
  );

  await broadcastTaskUpdates(req, workspace.workspaceId, tasks.map((t) => t.id));

  res.json({ ok: true });
};

export const getArchive = async (req, res) => {
  const { userId } = req.user;
  const { workspaceId, workspaceType } = req.query;
  const workspace = await resolveArchiveWorkspace(userId, workspaceId, workspaceType);
  if (!workspace) return res.json({ tasks: [] });

  const tasks = await Archive.find({
    workspaceId: workspace.workspaceId,
    restoredAt: null,
  }).lean();
  res.json({ tasks });
};

export const restoreOne = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const { workspaceId, workspaceType } = req.body;

  const workspace = await resolveArchiveWorkspace(userId, workspaceId, workspaceType);
  if (!workspace) return res.status(404).json({ error: 'workspace not found' });

  const now = Date.now();
  await Archive.updateOne(
    { _id: id, workspaceId: workspace.workspaceId },
    { $set: { restoredAt: now } }
  );
  await Task.updateOne(
    { taskId: id, workspaceId: workspace.workspaceId },
    { $set: { archived: false, updatedAt: now } }
  );

  await broadcastTaskUpdates(req, workspace.workspaceId, [id]);

  res.json({ ok: true });
};

export const restoreAll = async (req, res) => {
  const { userId } = req.user;
  const { workspaceId, workspaceType } = req.body;

  const workspace = await resolveArchiveWorkspace(userId, workspaceId, workspaceType);
  if (!workspace) return res.status(404).json({ error: 'workspace not found' });

  const archived = await Archive.find({
    workspaceId: workspace.workspaceId,
    restoredAt: null,
  }).lean();
  if (!archived.length) return res.json({ ok: true });

  const now = Date.now();
  await Archive.updateMany(
    { workspaceId: workspace.workspaceId, restoredAt: null },
    { $set: { restoredAt: now } }
  );

  await Task.updateMany(
    { taskId: { $in: archived.map(a => a._id) }, workspaceId: workspace.workspaceId },
    { $set: { archived: false, updatedAt: now } }
  );

  await broadcastTaskUpdates(req, workspace.workspaceId, archived.map((a) => a._id));

  res.json({ ok: true });
};
