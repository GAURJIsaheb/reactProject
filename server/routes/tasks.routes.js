import { Router } from 'express';
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
  getTaskImageUrl,
  syncTasks,
} from '../controllers/tasks.controller.js';

const router = Router();

router.post('/bulk-create',   asyncHandler(bulkCreateTasks));
router.post('/',              upload.single('image'),asyncHandler(createTask));
router.get('/',               asyncHandler(getAllTasks));
router.put('/bulk-update',    asyncHandler(bulkUpdateTasks));
router.get('/:id/image-url',  asyncHandler(getTaskImageUrl));
router.put('/:id',            upload.single('image'),asyncHandler( updateTask));
/*
upload.single("image")   ← multer intercepts requests with multipart/form-data
So multer runs before createTask.
 */
router.delete('/bulk-delete', asyncHandler(bulkDeleteTasks));
router.delete('/:id',         asyncHandler(deleteTask));

router.get('/workspace-id',   asyncHandler(getWorkspaceId));
router.get('/sync',           asyncHandler(syncTasks));

export default router;
