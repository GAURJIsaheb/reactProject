import { Task } from "../models/Task.model.js";
import { User } from "../models/User.model.js";
import { Archive } from "../models/Archive.model.js";
import { AnalyticsSnapshot } from "../models/AnalyticsSnapshot.model.js";


//helper: payload formatter
function buildAnalyticsPayload({
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
  scope,
}) {
  return {
    taskStatusCounts: taskStatusCounts[0] || {
      total: 0,
      active: 0,
      completed: 0,
      archived: 0,
      deleted: 0,
      withImage: 0,
    },

    taskPerUser,
    topUsers,
    activityByHour,
    activityByDay,
    recentActivity,
    totalUsers: totalUsers || 0,
    growthOverTime,
    archiveStats: archiveStats[0] || {
      total: 0,
      restored: 0,
      pending: 0,
    },

    completionRate,
    scope,
  };
}

export function parseAnalyticsScope(query = {}) {
  const now = new Date();
  const mode = query.mode === "year" ? "year" : "month";
  const parsedYear = Number(query.year);
  const year = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
    ? parsedYear
    : now.getUTCFullYear();//return year

  const parsedMonth = Number(query.month);

  //Date.UTC(year, monthIndex, day, hour, minute, second, millisecond)
  const month = Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
    ? parsedMonth
    : now.getUTCMonth() + 1;

  const startAt = mode === "year"
    ? Date.UTC(year, 0, 1, 0, 0, 0, 0)//year wise
    : Date.UTC(year, month - 1, 1, 0, 0, 0, 0);//month wise

  const endAt = mode === "year"
    ? Date.UTC(year + 1, 0, 1, 0, 0, 0, 0)//year wise
    : Date.UTC(year, month, 1, 0, 0, 0, 0);//month wise

  return {
    mode,
    year,
    month: mode === "month" ? month : null,
    startAt,
    endAt,
    label: mode === "year" ? `${year}` : `${year}-${String(month).padStart(2, "0")}`,
  };
}

// DB analytics 

export async function runAnalyticsQueries(scope) {
  const { startAt, endAt, mode } = scope;
  const createdRangeMatch = { createdAt: { $gte: startAt, $lt: endAt } };
  const updatedRangeMatch = { updatedAt: { $gte: startAt, $lt: endAt } };
  const archiveRangeMatch = { archivedAt: { $gte: startAt, $lt: endAt } };
  const growthDateFormat = mode === "year" ? "%Y-%m" : "%Y-%m-%d";

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
    Task.aggregate([//overall taskStatusCounts
      { $match: createdRangeMatch },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$completed", false] }, { $eq: ["$archived", false] }] },
                1,
                0,
              ],
            },
          },
          completed: { $sum: { $cond: ["$completed", 1, 0] } },
          archived: { $sum: { $cond: ["$archived", 1, 0] } },
          deleted: { $sum: { $cond: ["$deleted", 1, 0] } },
          withImage: {
            $sum: { $cond: [{ $and: ["$image", { $ne: ["$image", null] }] }, 1, 0] },
          },
        },
      },
    ]),

    Task.aggregate([//task per user
      { $match: { ...createdRangeMatch, deleted: false } },
      {
        $group: {
          _id: "$createdBy",
          count: { $sum: 1 },
          completed: { $sum: { $cond: ["$completed", 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: "$_id",
          name: "$userInfo.name",
          email: "$userInfo.email",
          count: 1,
          completed: 1,
        },
      },
    ]),

    Task.aggregate([//topUsers
      { $match: { ...updatedRangeMatch, deleted: false } },
      {
        $group: {
          _id: "$createdBy",
          taskCount: { $sum: 1 },
          avgVersion: { $avg: "$version" },
          lastActive: { $max: "$updatedAt" },
        },
      },
      { $sort: { avgVersion: -1, taskCount: -1 } },//--> ranking of users
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: "$userInfo.name",
          email: "$userInfo.email",
          taskCount: 1,
          avgVersion: 1,
          lastActive: 1,
        },
      },
    ]),

    Task.aggregate([//activityByHour
      { $match: { ...createdRangeMatch, deleted: false } },
      { $addFields: { hour: { $hour: { $toDate: "$createdAt" } } } },//timestamp to hour
      { $group: { _id: "$hour", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Task.aggregate([//activityByDay
      { $match: { ...createdRangeMatch, deleted: false } },
      { $addFields: { dow: { $dayOfWeek: { $toDate: "$createdAt" } } } },
      { $group: { _id: "$dow", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Task.aggregate([//recentActivity
      { $match: { ...updatedRangeMatch, deleted: false } },
      { $sort: { updatedAt: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          taskId: 1,
          text: 1,
          completed: 1,
          archived: 1,
          updatedAt: 1,
          createdAt: 1,
          name: "$userInfo.name",
          email: "$userInfo.email",
        },
      },
    ]),

    User.countDocuments({ createdAt: { $gte: startAt, $lt: endAt } }),//total users

    Task.aggregate([//growthOverTime
      {
        $match: {
          ...createdRangeMatch,
          deleted: false,
        },
      },
      {
        $addFields: {
          day: {
            $dateToString: {
              format: growthDateFormat,
              date: { $toDate: "$createdAt" },
            },
          },
        },
      },
      { $group: { _id: "$day", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Archive.aggregate([//archvie stats
      {
        $match: archiveRangeMatch,
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          restored: { $sum: { $cond: [{ $ne: ["$restoredAt", null] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$restoredAt", null] }, 1, 0] } },
        },
      },
    ]),

    Task.aggregate([//completionRate
      {
        $match: {
          ...createdRangeMatch,
          deleted: false,
        },
      },
      {
        $addFields: {
          day: {
            $dateToString: {
              format: growthDateFormat,
              date: { $toDate: "$createdAt" },
            },
          },
        },
      },
      {
        $group: {
          _id: "$day",
          total: { $sum: 1 },
          completed: { $sum: { $cond: ["$completed", 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $addFields: {
          rate: { $multiply: [{ $divide: ["$completed", "$total"] }, 100] },
        },
      },
    ]),
  ]);

  return buildAnalyticsPayload({
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
    scope,
  });
}

//controller ---- > reads from snapshot, falls back to live if missing
export async function getAnalytics(req, res) {
  const scope = parseAnalyticsScope(req.query);
  const forceRefresh = req.query.refresh === "true";

  if (!forceRefresh) {
    const cached = await AnalyticsSnapshot.findOne({ label: scope.label });//Snapshot lookup
    if (cached) {
      const { _id, __v, ...payload } = cached.toObject();
      return res.json({ ...payload, fromCache: true });
    }
  }

  // No snapshot yet — compute live and store it
  const payload = await runAnalyticsQueries(scope);
  
  // Store async, don't wait
  AnalyticsSnapshot.findOneAndUpdate(
    { label: scope.label },
    {
      label: scope.label,
      mode: scope.mode,
      year: scope.year,
      month: scope.month,
      ...payload,
      computedAt: Date.now(),
    },
    { upsert: true }
  ).catch(console.error);

  return res.json({ ...payload, fromCache: false });
}

//users list

export async function getUsers(req, res) {
  const usersList = await User.aggregate([
    {
      $lookup: {
        from: "tasks",
        localField: "_id",
        foreignField: "createdBy",
        pipeline: [
          { $match: { deleted: false } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              completed: { $sum: { $cond: ["$completed", 1, 0] } },
            },
          },
        ],
        as: "taskStats",
      },
    },
    { $unwind: { path: "$taskStats", preserveNullAndEmptyArrays: true } },
    { $project: { password: 0 } },
    { $sort: { createdAt: -1 } },
  ]);

  return res.json({ users: usersList });
}
