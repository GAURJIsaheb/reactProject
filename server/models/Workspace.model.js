import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema({
  workspaceId: { type: String, required: true, unique: true },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  type:        { type: String, enum: ['personal', 'professional'], required: true },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
  createdAt:   { type: Number, default: () => Date.now() },
  updatedAt:   { type: Number, default: () => Date.now() },
}, { versionKey: false });

workspaceSchema.index({ owner: 1, type: 1 }, { unique: true });

export const Workspace = mongoose.model('workspaces', workspaceSchema);