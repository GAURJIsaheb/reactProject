import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, unique: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    name: { type: String, trim: true, required: true },
    type: { type: String, required: true, trim: true, default: "custom" },
    emoji: { type: String, default: "\uD83D\uDCC1" },
    members: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
      default: [],
    },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Number, default: null },
    syncVersion: { type: Number, default: 0 },
    lastChangedAt: { type: Number, default: () => Date.now() },
    createdAt: { type: Number, default: () => Date.now() },
    updatedAt: { type: Number, default: () => Date.now() },
  },
  { versionKey: false }
);

workspaceSchema.index({ deleted: 1, owner: 1 });           
workspaceSchema.index({ members: 1, deleted: 1 });  

export const Workspace = mongoose.model("workspaces", workspaceSchema);
