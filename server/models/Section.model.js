import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema({
  _id:           { type: String },
  sectionId:     { type: String, required: true, unique: true },
  owner:         { type: String, required: true },
  workspaceType: { type: String, required: true, default: "personal" },
  workspaceId:   { type: String, default: null },
  title:         { type: String, required: true },
  order:         { type: Number, default: 0 },
  updatedAt:     { type: Number, default: () => Date.now() },
  createdAt:     { type: Number, default: () => Date.now() },
  deleted:       { type: Boolean, default: false },
  deletedAt:     { type: Number,  default: null },
},{ versionKey: false } );

sectionSchema.index({ owner: 1, workspaceType: 1, deleted: 1, order: 1 });
sectionSchema.index({ workspaceId: 1, deleted: 1, order: 1 });

export const Section = mongoose.model("sections", sectionSchema);
