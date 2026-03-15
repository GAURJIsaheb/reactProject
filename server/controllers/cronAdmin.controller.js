import { Task }    from '../models/Task.model.js';
import { Archive } from '../models/Archive.model.js';
import { deleteImageFromS3 } from '../s3/s3Service.js';
import { runAnalyticsQueries, parseAnalyticsScope } from "./admin.controller.js";
import { AnalyticsSnapshot } from "../models/AnalyticsSnapshot.model.js";

// ─── Constants ────────────────────────────────────────────────────────────────

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
export const SIXTY_DAYS_MS  = 60 * 24 * 60 * 60 * 1000;
export const TWENTY_FIVE_DAYS_MS = 25 * 24 * 60 * 60 * 1000;

// ─── Shared DB helpers (used by both cron jobs & admin routes) ────────────────

/** Hard-deletes soft-deleted tasks older than 30 days. Returns deleted count. */
export async function hardDeleteOldTasks() {
  const cutoff = Date.now() - THIRTY_DAYS_MS;

  const staleTasks = await Task.find({
    deleted: true,
    deletedAt: { $lt: cutoff },
    image: { $ne: null },
  }).select('image').lean();

  await Promise.allSettled(staleTasks.map(t => deleteImageFromS3(t.image)));

  const result = await Task.deleteMany({
    deleted:   true,
    deletedAt: { $lt: cutoff },
  });
  return result.deletedCount;
}

/** Hard-deletes un-restored archive entries older than 60 days. Returns deleted count. */
export async function hardDeleteOldArchives() {
  const cutoff = Date.now() - SIXTY_DAYS_MS;
  const result = await Archive.deleteMany({
    archivedAt: { $lt: cutoff },
    restoredAt: null,
  });
  return result.deletedCount;
}

/** Returns tasks deleted 25–30 days ago (approaching hard-delete window). */
export async function warnExpiringTasks() {
  const now    = Date.now();
  const nearly = now - TWENTY_FIVE_DAYS_MS; // 25+ days ago
  const cutoff = now - THIRTY_DAYS_MS;      // but not yet 30

  return Task.find({
    deleted:   true,
    deletedAt: { $lte: nearly, $gt: cutoff },
  })
    .select('taskId text createdBy workspaceId deletedAt')
    .lean();
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

// GET /admin/crons/status
export async function getCronStatus(req, res) {
  const now = Date.now();

  const [tasksPendingPurge, tasksSoonPurge, archivePendingPurge] =
    await Promise.all([
      Task.countDocuments({
        deleted:   true,
        deletedAt: { $lt: now - THIRTY_DAYS_MS },
      }),
      Task.countDocuments({
        deleted:   true,
        deletedAt: { $lt: now - TWENTY_FIVE_DAYS_MS, $gt: now - THIRTY_DAYS_MS },
      }),
      Archive.countDocuments({
        restoredAt: null,
        archivedAt: { $lt: now - SIXTY_DAYS_MS },
      }),
    ]);

  res.json({
    serverTime: new Date(now).toISOString(),
    jobs: [
      {
        name:             'task-cleanup',
        schedule:         '0 2 * * *  (daily 02:00 IST)',
        description:      'Hard-deletes soft-deleted tasks older than 30 days',
        readyToDelete:    tasksPendingPurge,
        expiringWithin5d: tasksSoonPurge,
      },
      {
        name:          'archive-cleanup',
        schedule:      '0 3 * * 0  (Sunday 03:00 IST)',
        description:   'Purges un-restored archive entries older than 60 days',
        readyToDelete: archivePendingPurge,
      },
    ],
  });
}

// POST /admin/crons/run/task-cleanup?dry=true
export async function runTaskCleanup(req, res) {
  const dry    = req.query.dry === 'true';
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const filter = { deleted: true, deletedAt: { $lt: cutoff } };

  if (dry) {
    const count = await Task.countDocuments(filter);
    return res.json({ dry: true, wouldDelete: count });
  }

  const deleted = await hardDeleteOldTasks();
  res.json({ dry: false, deleted });
}

// POST /admin/crons/run/archive-cleanup?dry=true
export async function runArchiveCleanup(req, res) {
  const dry    = req.query.dry === 'true';
  const cutoff = Date.now() - SIXTY_DAYS_MS;
  const filter = { restoredAt: null, archivedAt: { $lt: cutoff } };

  if (dry) {
    const count = await Archive.countDocuments(filter);
    return res.json({ dry: true, wouldDelete: count });
  }

  const deleted = await hardDeleteOldArchives();
  res.json({ dry: false, deleted });
}





//materlized schema or Storing Snapshot in db

export async function computeAndStoreSnapshot(mode, year, month) {
  const scope = parseAnalyticsScope({ mode, year, month });
  const payload = await runAnalyticsQueries(scope);

  await AnalyticsSnapshot.findOneAndUpdate(
    { label: scope.label },
    {
      label: scope.label,
      mode: scope.mode,
      year: scope.year,
      month: scope.month,
      ...payload,
      computedAt: Date.now(),
    },
    { upsert: true, new: true }
  );

  console.log(`[analytics] snapshot stored: ${scope.label}`);
  return payload;
}

// Called by cron — computes current month + current year
export async function refreshCurrentSnapshots() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  await Promise.all([
    computeAndStoreSnapshot("month", year, month),
    computeAndStoreSnapshot("year", year, null),
  ]);
}
