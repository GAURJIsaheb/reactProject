//Helpers for tasks controller
import crypto    from 'crypto';
import mongoose  from 'mongoose';
import { Workspace } from '../../models/Workspace.model.js';
import { getDefaultWorkspaceEmoji ,getDefaultWorkspaceName,isDefaultWorkspaceType,normalizeWorkspaceType, } from '../../utils/workspaceDefaults.js';

// ─── Normalizers ──────────────────────────────────────────────────────────────

export function normalizeReminderAt(reminderAt) {
  if (reminderAt === undefined || reminderAt === null || reminderAt === '') return null;
  const parsed = Number(reminderAt);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeLabels(labels) {
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

  const seen       = new Set();
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

export function normalizeSubtasks(subtasks) {
  let raw = subtasks;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      raw = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) return [];

  const normalized = [];
  const seenIds    = new Set();

  for (const value of raw) {
    const text = String(value?.text ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 80);

    if (!text) continue;
    if (normalized.length === 3) break;

    const id = String(value?.id ?? '').trim() || crypto.randomUUID();
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    normalized.push({
      id,
      text,
      completed: Boolean(value?.completed),
    });
  }

  return normalized;
}

// ─── Request helpers ──────────────────────────────────────────────────────────

export function getCallerId(req) {
  const raw = req.user?.userId ?? req.user?._id;
  if (!raw) return null;
  try {
    return new mongoose.Types.ObjectId(raw);
  } catch {
    return raw;
  }
}

// ─── Workspace resolution ─────────────────────────────────────────────────────

export async function ensureWorkspace(userId, workspaceType) {
  const type = normalizeWorkspaceType(workspaceType);
  if (!isDefaultWorkspaceType(type)) return null;

  const workspace = await Workspace.findOne(
    { owner: userId, type, deleted: false },
    { _id: 0, workspaceId: 1, type: 1 }
  ).lean();
  if (workspace) return workspace;

  const created = await Workspace.create({
    workspaceId: crypto.randomUUID(),
    owner:       userId,
    name:        getDefaultWorkspaceName(type),
    type,
    emoji:       getDefaultWorkspaceEmoji(type),
    members:     [],
  });

  return { workspaceId: created.workspaceId, type: created.type };
}

export async function resolveWorkspace(userId, workspaceType, workspaceId) {
  const normalizedType = normalizeWorkspaceType(workspaceType);
  const normalizedId   = String(workspaceId ?? '').trim();

  // Older clients can accidentally send the workspace slug instead of the UUID.
  if (normalizedId && normalizedId !== normalizedType) {
    return Workspace.findOne(
      {
        workspaceId: normalizedId,
        deleted:     false,
        $or: [{ owner: userId }, { members: userId }],
      },
      { _id: 0, workspaceId: 1, type: 1 }
    ).lean();
  }

  if (normalizedId && isDefaultWorkspaceType(normalizedId)) {
    return ensureWorkspace(userId, normalizedId);
  }

  if (isDefaultWorkspaceType(normalizedType)) {
    return ensureWorkspace(userId, normalizedType);
  }

  return null;
}

// ─── WebSocket broadcast ──────────────────────────────────────────────────────

export async function broadcastTaskState(req, type, taskOrTasks) {
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