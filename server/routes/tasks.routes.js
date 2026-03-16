import { Router } from 'express';
import { asyncHandler } from '../tryCatch/async.js';
import { upload }       from '../s3/upload.middleware.js';

import {
  createTask,
  bulkCreateTasks,
  getAllTasks,
  updateTask,
  deleteTask,
  bulkUpdateTasks,
  bulkDeleteTasks,
} from '../controllers/tasks/tasks.crud.controller.js';

import {
  getWorkspaceId,
  getTaskImageUrl,
  syncTasks,
} from '../controllers/tasks/tasks.sync.controller.js';

const router = Router();

// ─── Bulk ops (must come before /:id routes) ──────────────────────────────────
router.post  ('/bulk-create',  asyncHandler(bulkCreateTasks));
router.put   ('/bulk-update',  asyncHandler(bulkUpdateTasks));
router.delete('/bulk-delete',  asyncHandler(bulkDeleteTasks));

// ─── Sync / workspace ─────────────────────────────────────────────────────────
router.get('/workspace-id',    asyncHandler(getWorkspaceId));
router.get('/sync',            asyncHandler(syncTasks));

// ─── Single-task CRUD ─────────────────────────────────────────────────────────
router.post  ('/',             upload.single('image'), asyncHandler(createTask));
router.get   ('/',             asyncHandler(getAllTasks));
router.put   ('/:id',          upload.single('image'), asyncHandler(updateTask));
router.delete('/:id',          asyncHandler(deleteTask));

// ─── Task sub-resources ───────────────────────────────────────────────────────
router.get   ('/:id/image-url', asyncHandler(getTaskImageUrl));

export default router;