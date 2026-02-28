import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  taskId:        { type: String,  required: true, unique: true },
  workspaceId:   { type: String,  required: true, ref: 'workspaces' },
  sectionId:     { type: String,  default: null,  ref: 'sections' },
  text:          { type: String,  required: true, trim: true },
  image:         { type: String,  default: null }, // S3 key
  imageUrl:      { type: String,  default: null }, // cached signed URL
  imageUrlExpiry:{ type: Number,  default: null }, // ms timestamp
  completed:     { type: Boolean, default: false },
  archived:      { type: Boolean, default: false },
  deleted:       { type: Boolean, default: false },
  deletedAt:     { type: Number,  default: null },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  workspaceType: { type: String,  enum: ['personal', 'professional'], required: true },
  version:       { type: Number,  default: 1 },
  createdAt:     { type: Number,  default: () => Date.now() },
  updatedAt:     { type: Number,  default: () => Date.now() },
}, { versionKey: false });

taskSchema.index({ workspaceId: 1, deleted: 1 });
taskSchema.index({ sectionId: 1 });
taskSchema.index({ deleted: 1, createdBy: 1 });
taskSchema.index({ deleted: 1, updatedAt: -1 });
taskSchema.index({ deleted: 1, createdAt: 1 });
taskSchema.index({ deleted: 1, deletedAt: 1 });

export const Task = mongoose.model('tasks', taskSchema);