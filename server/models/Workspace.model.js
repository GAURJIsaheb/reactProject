import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, unique: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    type: { type: String, required: true, trim: true },
    emoji: { type: String, default: "📁" },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Number, default: null },
    createdAt: { type: Number, default: () => Date.now() },
    updatedAt: { type: Number, default: () => Date.now() },
  },
  { versionKey: false }
);

workspaceSchema.index({ owner: 1, type: 1, deleted: 1 }, { unique: true });
workspaceSchema.index({ deleted: 1, owner: 1 });

export const Workspace = mongoose.model("workspaces", workspaceSchema);
