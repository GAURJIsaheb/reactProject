import { Router } from 'express';
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
router.delete('/bulk-delete', asyncHandler(bulkDeleteTasks));
router.delete('/:id',         asyncHandler(deleteTask));

router.get('/workspace-id',   asyncHandler(getWorkspaceId));
router.get('/sync',           asyncHandler(syncTasks));

export default router;
