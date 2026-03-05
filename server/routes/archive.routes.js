import { Router } from 'express';
import {
  bulkArchive,
  restoreAll,
  restoreOne,
  getArchive,
} from '../controllers/archive.controller.js';
import { asyncHandler } from '../tryCatch/async.js';

const router = Router();

router.post('/bulk',                asyncHandler(bulkArchive));
router.patch('/restore-all',        asyncHandler(restoreAll));
router.patch('/:id/restore',        asyncHandler(restoreOne));
router.get('/',                     asyncHandler(getArchive));

export default router;