import { Task }             from '../../models/Task.model.js';
import { resolveImageUrl }  from '../../s3/s3Service.js';
import { TASK_PUBLIC_PROJECTION } from "../../utils/taskProjection.js";
import { isDefaultWorkspaceType } from '../../utils/workspaceDefaults.js';
import {
  getCallerId,
  resolveWorkspace,
} from './tasks.helpers.js';

// ─── Workspace ID ─────────────────────────────────────────────────────────────

export const getWorkspaceId = async (req, res) => {
  const { workspaceType, workspaceId } = req.query;

  const userId = getCallerId(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { normalizeWorkspaceType } = await import('../../utils/workspaceDefaults.js');
  const normalizedWorkspaceType    = normalizeWorkspaceType(workspaceType);

  if (!workspaceId && !isDefaultWorkspaceType(normalizedWorkspaceType)) {
    return res.status(400).json({ error: 'workspaceId is required for custom workspace' });
  }

  const ws = await resolveWorkspace(userId, normalizedWorkspaceType, workspaceId);
  if (!ws) return res.status(404).json({ error: 'workspace not found' });

  res.json({ workspaceId: ws.workspaceId });
};

// ─── Task Image URL ───────────────────────────────────────────────────────────

export const getTaskImageUrl = async (req, res) => {
  const { id: taskId } = req.params;

  const userId = getCallerId(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const task = await Task.findOne(
    { taskId, createdBy: userId, deleted: false },
    { _id: 0, taskId: 1, image: 1, imageUrl: 1, imageUrlExpiry: 1 }
  ).lean();

  if (!task)        return res.status(404).json({ error: 'Task not found' });
  if (!task.image)  return res.json({ imageUrl: null, imageUrlExpiry: null });

  const resolved = await resolveImageUrl(task, Task);
  return res.json({
    imageUrl:       resolved.imageUrl       ?? null,
    imageUrlExpiry: resolved.imageUrlExpiry ?? null,
  });
};

// ─── Sync ─────────────────────────────────────────────────────────────────────

export const syncTasks = async (req, res) => {
  const { lastSyncedAt, workspaceId } = req.query;
  const since = lastSyncedAt ? Number(lastSyncedAt) : 0;

  const tasks  = await Task.find(
    { workspaceId, updatedAt: { $gt: since } },
    TASK_PUBLIC_PROJECTION
  ).lean();

  const mapped = tasks.map((t) => ({ ...t, id: t.taskId }));

  res.json({ tasks: mapped, syncedAt: Date.now() });
};