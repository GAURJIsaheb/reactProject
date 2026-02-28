import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { asyncHandler } from '../TryCatch/async.js';
import { upload } from '../s3/upload.middleware.js';
import {
  bulkCreateTasks,
  createTask,
  getAllTasks,
  bulkUpdateTasks,
  updateTask,
  bulkDeleteTasks,
  deleteTask,
  getWorkspaceId,
  syncTasks,
} from '../controllers/tasks.controller.js';

const router = Router();

router.post('/bulk-create',   requireAuth, bulkCreateTasks);
router.post('/',              requireAuth, upload.single('image'), createTask);
router.get('/',               requireAuth, getAllTasks);
router.put('/bulk-update',    requireAuth, bulkUpdateTasks);
router.put('/:id',            requireAuth, upload.single('image'), updateTask);
router.delete('/bulk-delete', requireAuth, bulkDeleteTasks);
router.delete('/:id',         requireAuth, deleteTask);

router.get('/workspace-id', requireAuth, asyncHandler(getWorkspaceId));
router.get('/sync',         requireAuth, asyncHandler(syncTasks));

export default router;