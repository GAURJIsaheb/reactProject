import mongoose from 'mongoose';

const workspaceInviteSchema = new mongoose.Schema(
  {
    token:        { type: String, required: true, unique: true },//unique:true also create an indexing
    workspaceId:  { type: String, required: true },
    invitedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    invitedEmail: { type: String, required: true, lowercase: true, trim: true },
    status:       { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
    expiresAt:    { type: Number, required: true },
    createdAt:    { type: Number, default: () => Date.now() },
  },
  { versionKey: false }
);

workspaceInviteSchema.index({ workspaceId: 1, invitedEmail: 1, status: 1 });
workspaceInviteSchema.index({ workspaceId: 1, status: 1, expiresAt: 1 });

export const WorkspaceInvite = mongoose.model('workspaceinvites', workspaceInviteSchema);
