import express from 'express';
import { asyncHandler } from '../TryCatch/async.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { db } from '../mongo/mongo.js';
import { ObjectId } from 'mongodb';


const router = express.Router();

// ─── Super Admin Guard ────────────────────────────────────────────────────────
async function requireSuperAdmin(req, res, next) {
  const { userId } = req.user;
  const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });  if (!user || user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden: Super Admin only' });
  }
  next();
}

// ─── GET /admin/analytics ─────────────────────────────────────────────────────
// analytics endpoint — all aggregations in parallel
router.get('/analytics', requireAuth, requireSuperAdmin, asyncHandler(async (req, res) => {
  const tasks = db.collection("tasks");
  const users = db.collection("users");
  const archive = db.collection("archive");

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

    // 1. Task status counts (active, completed, archived, deleted)
    tasks.aggregate([
      {
        $group: {
          _id: null,
          total:     { $sum: 1 },
          active:    { $sum: { $cond: [ { $and: [{ $eq: ['$completed', false] }, { $eq: ['$deleted', false] }, { $eq: ['$archived', false] }] }, 1, 0] } },
          completed: { $sum: { $cond: ['$completed', 1, 0] } },
          archived:  { $sum: { $cond: ['$archived', 1, 0] } },
          deleted:   { $sum: { $cond: ['$deleted', 1, 0] } },
          withImage: { $sum: { $cond: [{ $and: ['$image', { $ne: ['$image', null] }] }, 1, 0] } },
        }
      }
    ]).toArray(),

    // 2. Tasks per user (join with users)
    tasks.aggregate([
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
    ]).toArray(),

    // 3. Top users by activity (most updates)
    tasks.aggregate([
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
    ]).toArray(),

    // 4. Activity by hour of day (when are tasks created/updated most)
    tasks.aggregate([
      { $match: { deleted: false } },
      { $addFields: { hour: { $hour: { $toDate: '$createdAt' } } } },
      { $group: { _id: '$hour', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray(),

    // 5. Activity by day of week
    tasks.aggregate([
      { $match: { deleted: false } },
      { $addFields: { dow: { $dayOfWeek: { $toDate: '$createdAt' } } } },
      { $group: { _id: '$dow', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray(),

    // 6. Recent activity (last 20 task events)
    tasks.aggregate([
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
    ]).toArray(),

    // 7. Total users
    users.countDocuments(),

    // 8. Task creation over last 30 days
    tasks.aggregate([
      {
        $match: {
          createdAt: { $gte: Date.now() - 30 * 24 * 60 * 60 * 1000 },
          deleted: false
        }
      },
      {
        $addFields: {
          day: {
            $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$createdAt' } }
          }
        }
      },
      { $group: { _id: '$day', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray(),

    // 9. Archive stats
    archive.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          restored: { $sum: { $cond: [{ $ne: ['$restoredAt', null] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$restoredAt', null] }, 1, 0] } },
        }
      }
    ]).toArray(),

    // 10. Completion rate trend (last 7 days)
    tasks.aggregate([
      {
        $match: {
          createdAt: { $gte: Date.now() - 7 * 24 * 60 * 60 * 1000 },
          deleted: false
        }
      },
      {
        $addFields: {
          day: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$createdAt' } } }
        }
      },
      {
        $group: {
          _id: '$day',
          total: { $sum: 1 },
          completed: { $sum: { $cond: ['$completed', 1, 0] } }
        }
      },
      { $sort: { _id: 1 } },
      {
        $addFields: {
          rate: { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }
        }
      }
    ]).toArray(),
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
  const usersList = await db.collection("users").aggregate([
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
    {
      $project: {
        password: 0,
      }
    },
    { $sort: { createdAt: -1 } }
  ]).toArray();

  res.json({ users: usersList });
}));



export default router;