import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { asyncHandler } from '../TryCatch/async.js';
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

router.post('/bulk-create', requireAuth, bulkCreateTasks);
router.post('/', requireAuth, createTask);
router.get('/', requireAuth, getAllTasks);
router.put('/bulk-update', requireAuth, bulkUpdateTasks);
router.put('/:id', requireAuth, updateTask);
router.delete('/bulk-delete', requireAuth, bulkDeleteTasks);
router.delete('/:id', requireAuth, deleteTask);

//sync
router.get('/workspace-id', requireAuth, asyncHandler(getWorkspaceId));
router.get('/sync', requireAuth, asyncHandler(syncTasks));

export default router;