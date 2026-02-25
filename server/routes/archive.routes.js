import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import {
  bulkArchive,
  restoreAll,
  restoreOne,
  getArchive,
} from '../controllers/archive.controller.js';

const router = Router();

router.post('/bulk', requireAuth, bulkArchive);
router.patch('/restore-all', requireAuth, restoreAll);
router.patch('/:id/restore', requireAuth, restoreOne);
router.get('/', requireAuth, getArchive);

export default router;