import { User } from '../models/User.model.js';
export async function requireSuperAdmin(req, res, next) {
  const { userId } = req.user;
  const user = await User.findById(userId).lean();
  if (!user || user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden: Super Admin only' });
  }
  next();
}
