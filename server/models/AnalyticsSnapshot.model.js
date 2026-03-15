import mongoose from "mongoose";

const analyticsSnapshotSchema = new mongoose.Schema({
  label: { type: String, required: true, unique: true }, // e.g. "2025-03" or "2025"
  mode: { type: String, enum: ["month", "year"], required: true },
  year: Number,
  month: Number, // null for year mode
  scope: Object,
  taskStatusCounts: Object,
  taskPerUser: Array,
  topUsers: Array,
  activityByHour: Array,
  activityByDay: Array,
  recentActivity: Array,
  totalUsers: Number,
  growthOverTime: Array,
  archiveStats: Object,
  completionRate: Array,
  computedAt: { type: Number, default: () => Date.now() },
},{ versionKey: false});

export const AnalyticsSnapshot = mongoose.model("AnalyticsSnapshot", analyticsSnapshotSchema);