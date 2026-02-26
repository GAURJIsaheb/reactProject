import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  taskId:      { type: String, required: true, unique: true },
  workspaceId: { type: String, required: true, ref: 'workspaces' },
  sectionId:   { type: String, default: null, ref: 'sections' },
  text:        { type: String, required: true, trim: true },
  image:       { type: String, default: null },
  completed:   { type: Boolean, default: false },
  archived:    { type: Boolean, default: false },
  deleted:     { type: Boolean, default: false },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  workspaceType: { type: String, enum: ['personal', 'professional'], required: true },
  version:     { type: Number, default: 1 },
  createdAt:   { type: Number, default: () => Date.now() },
  updatedAt:   { type: Number, default: () => Date.now() },
}, { versionKey: false });

taskSchema.index({ workspaceId: 1, deleted: 1 });
taskSchema.index({ sectionId: 1 });

export const Task = mongoose.model('tasks', taskSchema);