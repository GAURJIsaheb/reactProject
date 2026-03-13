import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  notificationId: { type: String, required: true, unique: true },
  kind: { type: String, enum: ['task_completed'], required: true },
  taskId: { type: String, required: true },
  taskText: { type: String, required: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  workspaceType: { type: String, required: true, trim: true },
  read: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Number, default: null },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
}, { versionKey: false });

notificationSchema.index({ createdBy: 1, workspaceType: 1, updatedAt: 1 });
notificationSchema.index({ createdBy: 1, workspaceType: 1, deleted: 1, read: 1 });

export const Notification = mongoose.model('notifications', notificationSchema);
