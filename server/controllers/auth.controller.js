//forgot+reset password

import crypto from 'crypto';
import { User }       from '../models/User.model.js';
import { ResetToken } from '../models/ResetToken.model.js';
import { sendForgotPasswordMessage } from '../sqs/sqsProducer.js';
import bcrypt from 'bcrypt';

// POST /forgot-password
export const forgotPassword =async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = await User.findOne({ email: email.toLowerCase() }).lean();

  // Always return same response — don't leak if email exists
  if (!user) {
    return res.json({ message: 'If this email exists, a reset link has been sent.' });
  }

  // Invalidate old tokens for this user
  await ResetToken.deleteMany({ userId: user._id });

  // Generate secure token
  const rawToken  = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  await ResetToken.create({
    userId:    user._id,
    token:     rawToken,
    expiresAt,
  });


 // You keep domain knowledge in API layer.
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

  // Push to SQS — fire and forget (don't block response) 
  sendForgotPasswordMessage({
    email:    user.email,
    resetUrl,
    userName: user.name || user.email.split('@')[0],
  }).catch(err => console.error('SQS send failed:', err));

  res.json({ message: 'If this email exists, a reset link has been sent.' });
};

// POST /reset-password
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and password required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const resetToken = await ResetToken.findOne({ token, used: false });

  if (!resetToken) return res.status(400).json({ error: 'Invalid or expired token' });
  if (new Date() > resetToken.expiresAt) {
    await ResetToken.deleteOne({ _id: resetToken._id });
    return res.status(400).json({ error: 'Token expired' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await User.updateOne({ _id: resetToken.userId }, { password: hashed });

  // Mark token as used + delete
  await ResetToken.deleteOne({ _id: resetToken._id });

  res.json({ message: 'Password reset successful' });
};