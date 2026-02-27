
// Mount: app.use('/admin/crons', requireAuth, requireAdmin, cronAdminRouter)

import express from 'express';
import { Task }    from '../models/Task.model.js';
import { Archive } from '../models/Archive.model.js';

const router = express.Router();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SIXTY_DAYS_MS  = 60 * 24 * 60 * 60 * 1000;

// GET /admin/crons/status
// Live preview of what each job would affect right now
router.get('/status', async (req, res) => {
  const now = Date.now();

  const [
    tasksPendingPurge,
    tasksSoonPurge,
    archivePendingPurge,
  ] = await Promise.all([
    // Tasks: deleted=true, deletedAt older than 30 days
    Task.countDocuments({
      deleted:   true,
      deletedAt: { $lt: now - THIRTY_DAYS_MS },
    }),
    // Tasks: deleted=true, deletedAt between 25–30 days ago (expiry warning zone)
    Task.countDocuments({
      deleted:   true,
      deletedAt: { $lt: now - 25 * 24 * 60 * 60 * 1000, $gt: now - THIRTY_DAYS_MS },
    }),
    // Archives: un-restored, archivedAt older than 60 days
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
});

// POST /admin/crons/run/task-cleanup  — manual dry-run or live run
// ?dry=true  → just counts, doesn't delete
router.post('/run/task-cleanup', async (req, res) => {
  const dry    = req.query.dry === 'true';
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const filter = { deleted: true, deletedAt: { $lt: cutoff } };

  if (dry) {
    const count = await Task.countDocuments(filter);
    return res.json({ dry: true, wouldDelete: count });
  }

  const result = await Task.deleteMany(filter);
  res.json({ dry: false, deleted: result.deletedCount });
});

// POST /admin/crons/run/archive-cleanup
router.post('/run/archive-cleanup', async (req, res) => {
  const dry    = req.query.dry === 'true';
  const cutoff = Date.now() - SIXTY_DAYS_MS;
  const filter = { restoredAt: null, archivedAt: { $lt: cutoff } };

  if (dry) {
    const count = await Archive.countDocuments(filter);
    return res.json({ dry: true, wouldDelete: count });
  }

  const result = await Archive.deleteMany(filter);
  res.json({ dry: false, deleted: result.deletedCount });
});

export default router;