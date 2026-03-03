import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { asyncHandler } from '../tryCatch/async.js';
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

router.post('/bulk-create',   requireAuth, asyncHandler(bulkCreateTasks));
router.post('/',              requireAuth, upload.single('image'),asyncHandler(createTask));
router.get('/',               requireAuth, asyncHandler(getAllTasks));
router.put('/bulk-update',    requireAuth, asyncHandler(bulkUpdateTasks));
router.put('/:id',            requireAuth, upload.single('image'),asyncHandler( updateTask));
router.delete('/bulk-delete', requireAuth, asyncHandler(bulkDeleteTasks));
router.delete('/:id',         requireAuth, asyncHandler(deleteTask));

router.get('/workspace-id', requireAuth, asyncHandler(getWorkspaceId));
router.get('/sync',         requireAuth, asyncHandler(syncTasks));

export default router;