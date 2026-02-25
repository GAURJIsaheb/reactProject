import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import {
  bulkCreateTasks,
  createTask,
  getAllTasks,
  bulkUpdateTasks,
  updateTask,
  bulkDeleteTasks,
  deleteTask,
} from '../controllers/tasks.controller.js';

const router = Router();

router.post('/bulk-create', requireAuth, bulkCreateTasks);
router.post('/', requireAuth, createTask);
router.get('/', requireAuth, getAllTasks);
router.put('/bulk-update', requireAuth, bulkUpdateTasks);
router.put('/:id', requireAuth, updateTask);
router.delete('/bulk-delete', requireAuth, bulkDeleteTasks);
router.delete('/:id', requireAuth, deleteTask);

export default router;