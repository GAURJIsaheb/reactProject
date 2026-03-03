import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import {
  bulkArchive,
  restoreAll,
  restoreOne,
  getArchive,
} from '../controllers/archive.controller.js';
import { asyncHandler } from '../tryCatch/async.js';

const router = Router();

router.post('/bulk', requireAuth, asyncHandler(bulkArchive));
router.patch('/restore-all', requireAuth, asyncHandler(restoreAll));
router.patch('/:id/restore', requireAuth, asyncHandler(restoreOne));
router.get('/', requireAuth, asyncHandler(getArchive));

export default router;