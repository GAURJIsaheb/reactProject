import cron from 'node-cron';
import { Task } from '../models/Task.model.js';
import { Archive } from '../models/Archive.model.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a Unix timestamp (ms) for N days ago */
function msAgo(days) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function log(label, data = {}) {
  const ts = new Date().toISOString();
  console.log(`[CRON][${ts}] ${label}`, Object.keys(data).length ? data : '');
}

// ─── Job 1: Hard-delete soft-deleted tasks older than 30 days ─────────────────

// Schedule: every day at 02:00
export function scheduleTaskCleanup() {
  cron.schedule('0 2 * * *', async () => {
    log('task-cleanup: starting');
    try {
      const cutoff = msAgo(30); // 30 days ago in ms

      const result = await Task.deleteMany({
        deleted:   true,
        deletedAt: { $lt: cutoff },   // deletedAt is a Number (Unix ms)
      });

      log('task-cleanup: complete', { hardDeleted: result.deletedCount });
    } catch (err) {
      console.error('[CRON][task-cleanup] ERROR:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  log('task-cleanup: scheduled — daily 02:00 IST');
}

// ─── Job 2: Hard-delete archive entries older than 60 days ───────────────────

// Schedule: every Sunday at 03:00
export function scheduleArchiveCleanup() {
  cron.schedule('0 3 * * 0', async () => {
    log('archive-cleanup: starting');
    try {
      const cutoff = msAgo(60);

      const result = await Archive.deleteMany({
        archivedAt: { $lt: cutoff },
        restoredAt: null,             // only purge un-restored archives
      });

      log('archive-cleanup: complete', { hardDeleted: result.deletedCount });
    } catch (err) {
      console.error('[CRON][archive-cleanup] ERROR:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  log('archive-cleanup: scheduled — every Sunday 03:00 IST');
}

// ─── Job 3: Flag tasks that are approaching the 30-day hard-delete window ────

// Schedule: every day at 08:00
export function scheduleExpiryWarnings() {
  cron.schedule('0 8 * * *', async () => {
    log('expiry-warning: starting');
    try {
      const nearly = msAgo(25); // deleted 25+ days ago
      const cutoff = msAgo(30); // but not yet 30

      const expiring = await Task.find({
        deleted:   true,
        deletedAt: { $lte: nearly, $gt: cutoff },
      })
        .select('taskId text createdBy workspaceId deletedAt')
        .lean();

      if (!expiring.length) {
        log('expiry-warning: no tasks expiring soon');
        return;
      }

      log('expiry-warning: tasks expiring within 5 days', {
        count: expiring.length,
        sample: expiring.slice(0, 3).map(t => ({ taskId: t.taskId, text: t.text })),
      });



    } catch (err) {
      console.error('[CRON][expiry-warning] ERROR:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  log('expiry-warning: scheduled — daily 08:00 IST');
}

// ─── Register all jobs (call once after DB connects) ─────────────────────────
export function registerCronJobs() {
  scheduleTaskCleanup();
  scheduleArchiveCleanup();
  scheduleExpiryWarnings();
  log('All cron jobs registered ✓');
}