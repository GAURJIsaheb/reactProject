
import express from 'express';
import {
  getCronStatus,
  runTaskCleanup,
  runArchiveCleanup,
} from '../controllers/cronAdmin.controller.js';
import { asyncHandler } from '../TryCatch/async.js';

const router = express.Router();

// GET  /admin/crons/status                 
router.get('/status', asyncHandler(getCronStatus));

// POST /admin/crons/run/task-cleanup      
router.post('/run/task-cleanup', asyncHandler(runTaskCleanup));

// POST /admin/crons/run/archive-cleanup   
router.post('/run/archive-cleanup', asyncHandler(runArchiveCleanup));

export default router;
