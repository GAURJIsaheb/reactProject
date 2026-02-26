import mongoose from 'mongoose';

const archiveSchema = new mongoose.Schema({
  _id:              { type: String },   // taskId as _id (existing pattern raka)
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  workspaceId:      { type: String, ref: 'workspaces', required: true },
  encryptedPayload: { type: mongoose.Schema.Types.Mixed, default: null },
  archivedAt:       { type: Number, default: () => Date.now() },
  restoredAt:       { type: Number, default: null },
}, { versionKey: false});

archiveSchema.index({ userId: 1, restoredAt: 1 });

export const Archive = mongoose.model('archive', archiveSchema);