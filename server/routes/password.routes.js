import { Router } from 'express';
import { forgotPassword, resetPassword } from '../controllers/password.controller.js';
import { forgotPasswordRateLimiter } from '../middlewares/rateLimiter.js';
import { asyncHandler } from '../TryCatch/async.js';

const router = Router();

router.post('/forgot', forgotPasswordRateLimiter, asyncHandler(forgotPassword));    // POST /password/forgot
router.post('/reset',  asyncHandler(resetPassword));     // POST /password/reset

export default router;
