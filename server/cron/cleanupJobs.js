import cron from 'node-cron';
import {
  hardDeleteOldTasks,
  hardDeleteOldArchives,
  warnExpiringTasks,
  refreshCurrentSnapshots,
} from '../controllers/cronAdmin.controller.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(label, data = {}) {
  const ts = new Date().toISOString();
  console.log(`[CRON][${ts}] ${label}`, Object.keys(data).length ? data : '');
}

// ─── Job 1: Hard-delete soft-deleted tasks older than 30 days ─────────────────
// every day at 02:00 IST
function scheduleTaskCleanup() {
  cron.schedule('0 2 * * *', async () => {
    log('task-cleanup: starting');
    try {
      const deleted = await hardDeleteOldTasks();
      log('task-cleanup: complete', { hardDeleted: deleted });
    } catch (err) {
      console.error('[CRON][task-cleanup] ERROR:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  log('task-cleanup: scheduled — daily 02:00 IST');
}

// ─── Job 2: Hard-delete for archive ---- > older than 60 days ───────────────────
// every Sunday at 03:00 IST
function scheduleArchiveCleanup() {
  cron.schedule('0 3 * * 0', async () => {
    log('archive-cleanup: starting');
    try {
      const deleted = await hardDeleteOldArchives();
      log('archive-cleanup: complete', { hardDeleted: deleted });
    } catch (err) {
      console.error('[CRON][archive-cleanup] ERROR:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  log('archive-cleanup: scheduled — every Sunday 03:00 IST');
}

// ─── Job 3: Flag tasks approaching the 30-day hard-delete window ─────────────
// every day--- > 08:00 IST
function scheduleExpiryWarnings() {
  cron.schedule('0 8 * * *', async () => {
    log('expiry-warning: starting');
    try {
      const expiring = await warnExpiringTasks();

      if (!expiring.length) {
        log('expiry-warning: no tasks expiring soon');
        return;
      }

      log('expiry-warning: tasks expiring within 5 days', {
        count:  expiring.length,
        sample: expiring.slice(0, 3).map(t => ({ taskId: t.taskId, text: t.text })),
      });
    } catch (err) {
      console.error('[CRON][expiry-warning] ERROR:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  log('expiry-warning: scheduled — daily 08:00 IST');
}

// ─── Job 4: Pre-compute analytics snapshot 
// every day at 01:00 IST (before task-cleanup at 02:00  ---> as to avoid concurrency issues due to hard deletion of data)
function scheduleAnalyticsSnapshot() {
  cron.schedule('0 1 * * *', async () => {
    log('analytics-snapshot: starting');
    try {
      await refreshCurrentSnapshots();
      log('analytics-snapshot: complete');
    } catch (err) {
      console.error('[CRON][analytics-snapshot] ERROR:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  log('analytics-snapshot: scheduled — daily 01:00 IST');
}


// ─── Register all jobs (call once after DB connects) ─────────────────────────
export function registerCronJobs() {//initialisation in server/index.js
  scheduleTaskCleanup();
  scheduleArchiveCleanup();
  scheduleExpiryWarnings();
  scheduleAnalyticsSnapshot();
  log('All cron jobs registered ✓');
}







/*
eg tasks to show deletion of cron jobs:

db.tasks.insertOne({
  taskId: "test-old-task",
  workspaceId: "ws1",
  text: "old deleted task",
  deleted: true,
  deletedAt: Date.now() - (35 * 24 * 60 * 60 * 1000),
  createdBy: ObjectId("64a000000000000000000001"),
  workspaceType: "personal",
  labels: [],
  subtasks: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: 1
})




*/