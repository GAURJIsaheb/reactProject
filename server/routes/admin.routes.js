import express from 'express';
import { asyncHandler } from '../tryCatch/async.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { User } from '../models/User.model.js';
import { getAnalytics, getUsers } from '../controllers/admin.controller.js';

const router = express.Router();

// ─── Super Admin Guard ────────────────────────────────────────────────────────
async function requireSuperAdmin(req, res, next) {
  const { userId } = req.user;
  const user = await User.findById(userId).lean();
  if (!user || user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden: Super Admin only' });
  }
  next();
}

router.get('/analytics', requireAuth, requireSuperAdmin, asyncHandler(getAnalytics));
router.get('/users',     requireAuth, requireSuperAdmin, asyncHandler(getUsers));

export default router;