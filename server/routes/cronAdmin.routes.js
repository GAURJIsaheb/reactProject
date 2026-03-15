
import express from 'express';
import {
  getCronStatus,
  runTaskCleanup,
  runArchiveCleanup,
  computeAndStoreSnapshot,
} from '../controllers/cronAdmin.controller.js';
import { asyncHandler } from '../tryCatch/async.js';

const router = express.Router();

// GET  /admin/crons/status                 
router.get('/status', asyncHandler(getCronStatus));

// POST /admin/crons/run/task-cleanup      
router.post('/run/task-cleanup', asyncHandler(runTaskCleanup));

// POST /admin/crons/run/archive-cleanup   
router.post('/run/archive-cleanup', asyncHandler(runArchiveCleanup));

router.post('/analytics/refresh', asyncHandler(async (req, res) => {
  const { mode, year, month } = req.body;
  await computeAndStoreSnapshot(mode, year, month);
  return res.json({ ok: true });
}));

export default router;
