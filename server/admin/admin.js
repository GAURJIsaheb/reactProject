import express from 'express';
import { asyncHandler } from '../TryCatch/async.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { Task }    from '../models/Task.model.js';
import { User }    from '../models/User.model.js';
import { Archive } from '../models/Archive.model.js';

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

// ─── GET /admin/analytics ─────────────────────────────────────────────────────
router.get('/analytics', requireAuth, requireSuperAdmin, asyncHandler(async (req, res) => {

  const [
    taskStatusCounts,
    taskPerUser,
    topUsers,
    activityByHour,
    activityByDay,
    recentActivity,
    totalUsers,
    growthOverTime,
    archiveStats,
    completionRate,
  ] = await Promise.all([

    // 1. Task status counts
    Task.aggregate([
      {
        $group: {
          _id: null,
          total:     { $sum: 1 },
          active:    { $sum: { $cond: [{ $and: [{ $eq: ['$completed', false] }, { $eq: ['$deleted', false] }, { $eq: ['$archived', false] }] }, 1, 0] } },
          completed: { $sum: { $cond: ['$completed', 1, 0] } },
          archived:  { $sum: { $cond: ['$archived',  1, 0] } },
          deleted:   { $sum: { $cond: ['$deleted',   1, 0] } },
          withImage: { $sum: { $cond: [{ $and: ['$image', { $ne: ['$image', null] }] }, 1, 0] } },
        }
      }
    ]),

    // 2. Tasks per user
    Task.aggregate([
      { $match: { deleted: false } },
      { $group: { _id: '$createdBy', count: { $sum: 1 }, completed: { $sum: { $cond: ['$completed', 1, 0] } } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          let: { uid: '$_id' },
          pipeline: [
            { $addFields: { strId: { $toString: '$_id' } } },
            { $match: { $expr: { $eq: ['$strId', '$$uid'] } } },
            { $project: { name: 1, email: 1 } }
          ],
          as: 'userInfo'
        }
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
      { $project: { userId: '$_id', name: '$userInfo.name', email: '$userInfo.email', count: 1, completed: 1 } }
    ]),

    // 3. Top users by activity
    Task.aggregate([
      { $match: { deleted: false } },
      { $group: { _id: '$createdBy', taskCount: { $sum: 1 }, avgVersion: { $avg: '$version' }, lastActive: { $max: '$updatedAt' } } },
      { $sort: { avgVersion: -1, taskCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          let: { uid: '$_id' },
          pipeline: [
            { $addFields: { strId: { $toString: '$_id' } } },
            { $match: { $expr: { $eq: ['$strId', '$$uid'] } } },
            { $project: { name: 1, email: 1 } }
          ],
          as: 'userInfo'
        }
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$userInfo.name', email: '$userInfo.email', taskCount: 1, avgVersion: 1, lastActive: 1 } }
    ]),

    // 4. Activity by hour
    Task.aggregate([
      { $match: { deleted: false } },
      { $addFields: { hour: { $hour: { $toDate: '$createdAt' } } } },
      { $group: { _id: '$hour', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),

    // 5. Activity by day of week
    Task.aggregate([
      { $match: { deleted: false } },
      { $addFields: { dow: { $dayOfWeek: { $toDate: '$createdAt' } } } },
      { $group: { _id: '$dow', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),

    // 6. Recent activity
    Task.aggregate([
      { $match: { deleted: false } },
      { $sort: { updatedAt: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          let: { uid: '$createdBy' },
          pipeline: [
            { $addFields: { strId: { $toString: '$_id' } } },
            { $match: { $expr: { $eq: ['$strId', '$$uid'] } } },
            { $project: { name: 1, email: 1 } }
          ],
          as: 'userInfo'
        }
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
      { $project: { taskId: 1, text: 1, completed: 1, archived: 1, updatedAt: 1, createdAt: 1, name: '$userInfo.name', email: '$userInfo.email' } }
    ]),

    // 7. Total users
    User.countDocuments(),

    // 8. Growth over last 30 days
    Task.aggregate([
      {
        $match: {
          deleted: false,
          createdAt: { $gte: Date.now() - 30 * 24 * 60 * 60 * 1000 }
        }
      },
      { $addFields: { day: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$createdAt' } } } } },
      { $group: { _id: '$day', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),

    // 9. Archive stats
    Archive.aggregate([
      {
        $group: {
          _id: null,
          total:    { $sum: 1 },
          restored: { $sum: { $cond: [{ $ne: ['$restoredAt', null] }, 1, 0] } },
          pending:  { $sum: { $cond: [{ $eq: ['$restoredAt', null] }, 1, 0] } },
        }
      }
    ]),

    // 10. Completion rate — last 7 days
    Task.aggregate([
      {
        $match: {
          deleted: false,
          createdAt: { $gte: Date.now() - 7 * 24 * 60 * 60 * 1000 }
        }
      },
      { $addFields: { day: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$createdAt' } } } } },
      {
        $group: {
          _id: '$day',
          total:     { $sum: 1 },
          completed: { $sum: { $cond: ['$completed', 1, 0] } }
        }
      },
      { $sort: { _id: 1 } },
      { $addFields: { rate: { $multiply: [{ $divide: ['$completed', '$total'] }, 100] } } }
    ]),
  ]);

  res.json({
    taskStatusCounts: taskStatusCounts[0] || {},
    taskPerUser,
    topUsers,
    activityByHour,
    activityByDay,
    recentActivity,
    totalUsers,
    growthOverTime,
    archiveStats: archiveStats[0] || {},
    completionRate,
  });
}));

// ─── GET /admin/users ─────────────────────────────────────────────────────────
router.get('/users', requireAuth, requireSuperAdmin, asyncHandler(async (req, res) => {
  const usersList = await User.aggregate([
    {
      $lookup: {
        from: 'tasks',
        let: { uid: { $toString: '$_id' } },
        pipeline: [
          { $match: { $expr: { $eq: ['$createdBy', '$$uid'] }, deleted: false } },
          { $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: ['$completed', 1, 0] } } } }
        ],
        as: 'taskStats'
      }
    },
    { $unwind: { path: '$taskStats', preserveNullAndEmptyArrays: true } },
    { $project: { password: 0 } },
    { $sort: { createdAt: -1 } }
  ]);

  res.json({ users: usersList });
}));

export default router;