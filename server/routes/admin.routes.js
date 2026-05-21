import express from 'express';
import { asyncHandler } from '../TryCatch/async.js';
import { getAnalytics, getUsers } from '../controllers/admin.controller.js';

const router = express.Router();



router.get('/analytics',    asyncHandler(getAnalytics));
router.get('/users',        asyncHandler(getUsers));

export default router;
