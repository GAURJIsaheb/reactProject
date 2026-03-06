import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  sectionId:     { type: String, required: true, unique: true },
  owner:         { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  workspaceType: { type: String, required: true, trim: true },
  title:         { type: String, required: true, trim: true },
  order:         { type: Number, default: 0 },
  createdAt:     { type: Number, default: () => Date.now() },
  updatedAt:     { type: Number, default: () => Date.now() },
}, { versionKey: false });

sectionSchema.index({ owner: 1, workspaceType: 1, order: 1 });

export const Section = mongoose.model('sections', sectionSchema);
