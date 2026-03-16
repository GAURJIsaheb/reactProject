import { Archive }   from '../models/Archive.model.js';
import { Task }      from '../models/Task.model.js';
import { Workspace } from '../models/Workspace.model.js';
import { normalizeWorkspaceType } from '../utils/workspaceDefaults.js';
import { TASK_PUBLIC_PROJECTION } from '../utils/taskProjection.js';
import { bumpWorkspaceSync } from '../utils/workspaceSync.js';//increment version + updating(lastChangedAt and updatedAt)

//helpers

//Purpose: figure out which workspace we are working with and ensure the user has access.
async function helper_resolveArchiveWorkspace(userId, workspaceId, workspaceType) {
  if (workspaceId) {
    return Workspace.findOne(//if workspaceID is provided from the frontend side
      {
        workspaceId,
        deleted: false,
        $or: [{ owner: userId }, { members: userId }],
      },
      { _id: 0, workspaceId: 1 }
    ).lean();
  }

  return Workspace.findOne(//if workspaceID ise not provided from the frontend side
    {
      owner: userId,
      type: normalizeWorkspaceType(workspaceType),
      deleted: false,
    },
    { _id: 0, workspaceId: 1 }
  ).lean();
}


//Purpose: send realtime updates to all connected collaborators.
async function helper_broadcastTaskUpdates(req, workspaceId, taskIds) {
  if (!workspaceId || !taskIds.length) return;
  const updatedTasks = await Task.find(
    { taskId: { $in: taskIds } },
    TASK_PUBLIC_PROJECTION
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



//controllers
export const bulkArchive = async (req, res) => {
  const { tasks } = req.body;
  const { userId } = req.user;

  if (!Array.isArray(tasks) || !tasks.length)//simple input validation
    return res.status(400).json({ error: 'tasks array required' });

  const workspace = await helper_resolveArchiveWorkspace(
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
        update: { $set: doc },//If found → overwrite fields.
        upsert: true,
      },
    })),
    { ordered: false }//so that:failures don't block the rest.
  );

  await Task.updateMany(//Mark tasks as archived
    { taskId: { $in: tasks.map(t => t.id) } },
    { $set: { archived: true, updatedAt: now } }
  );

  await bumpWorkspaceSync(workspace.workspaceId);
  await helper_broadcastTaskUpdates(req, workspace.workspaceId, tasks.map((t) => t.id));

  res.json({ ok: true });
};

export const getArchive = async (req, res) => {
  const { userId } = req.user;
  const { workspaceId, workspaceType } = req.query;
  const workspace = await helper_resolveArchiveWorkspace(userId, workspaceId, workspaceType);
  if (!workspace) return res.json({ tasks: [] });

  const tasks = await Archive.find({
    workspaceId: workspace.workspaceId,
    restoredAt: null,
  })
    .select('_id userId workspaceId encryptedPayload archivedAt restoredAt')
    .lean();
  res.json({ tasks });
};

export const restoreOne = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const { workspaceId, workspaceType } = req.body;

  const workspace = await helper_resolveArchiveWorkspace(userId, workspaceId, workspaceType);
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

  await bumpWorkspaceSync(workspace.workspaceId);
  await helper_broadcastTaskUpdates(req, workspace.workspaceId, [id]);

  res.json({ ok: true });
};

export const restoreAll = async (req, res) => {
  const { userId } = req.user;
  const { workspaceId, workspaceType } = req.body;

  const workspace = await helper_resolveArchiveWorkspace(userId, workspaceId, workspaceType);
  if (!workspace) return res.status(404).json({ error: 'workspace not found' });

  const archived = await Archive.find({
    workspaceId: workspace.workspaceId,
    restoredAt: null,
  })
    .select('_id')
    .lean();
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

  await bumpWorkspaceSync(workspace.workspaceId);
  await helper_broadcastTaskUpdates(req, workspace.workspaceId, archived.map((a) => a._id));

  res.json({ ok: true });
};
