import crypto from "crypto";
import mongoose from "mongoose";

import { Workspace } from "../models/Workspace.model.js";
import { WorkspaceInvite } from "../models/WorkspaceInvite.model.js";
import { User } from "../models/User.model.js";
import { Task } from "../models/Task.model.js";
import { Section } from "../models/Section.model.js";
import { sendInviteEmail } from "../sqs/mailer.js";
import { asyncHandler } from "../tryCatch/async.js";
import {
  getWorkspaceDisplayName,
  getDefaultWorkspaceEmoji,
  isDefaultWorkspaceType,
} from "../utils/workspaceDefaults.js";
import { bumpWorkspaceSync } from "../utils/workspaceSync.js";


//helpers
function getCallerId(req) {
  const raw = req.user?.userId ?? req.user?._id;
  if (!raw) return null;
  try {
    return new mongoose.Types.ObjectId(raw);
  } catch {
    return raw;
  }
}

function resolveWorkspaceEmoji(name, emoji) {
  const trimmedEmoji = String(emoji ?? "").trim();
  if (trimmedEmoji) return trimmedEmoji;
  return getDefaultWorkspaceEmoji(name);
}

function formatWorkspaceMember(user) {
  if (!user?._id) return null;

  const email = String(user.email ?? "").trim().toLowerCase();
  const fallbackName = email ? email.split("@")[0] : "Member";
  const name = String(user.name ?? "").trim() || fallbackName;

  return {
    _id: user._id.toString(),
    name,
    email,
  };
}

function isWorkspaceMember(value) {
  return Boolean(value?._id && value.email);
}

//controllers
export const createWorkspace = asyncHandler(async (req, res) => {
  const { name, emoji } = req.body;
  const ownerId = getCallerId(req);

  if (!ownerId) return res.status(401).json({ error: "Not authenticated" });
  if (!name?.trim()) return res.status(400).json({ error: "name is required" });

  const trimmedName = name.trim();
  const slug = trimmedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const workspaceId = `${slug}-${crypto.randomBytes(4).toString("hex")}`;
  const emojiToSave = resolveWorkspaceEmoji(trimmedName, emoji);

  const existing = await Workspace.findOne({
    owner: ownerId,
    deleted: false,
    name: trimmedName,
  }).select('workspaceId name type emoji updatedAt');//id,emoji,updateAt
  if (existing) {
    if (existing.emoji !== emojiToSave) {
      existing.emoji = emojiToSave;
      existing.updatedAt = Date.now();
      await existing.save();
    }
    return res.status(200).json({ workspaceId: existing.workspaceId });
  }

  await Workspace.create({
    workspaceId,
    owner: ownerId,
    name: trimmedName,
    type: "custom",
    emoji: emojiToSave,
    members: [],
  });

  return res.status(201).json({ workspaceId });
});

export const listMyWorkspaces = asyncHandler(async (req, res) => {
  const callerId = getCallerId(req);
  if (!callerId) return res.status(401).json({ error: "Not authenticated" });

  const workspaces = await Workspace.find({
    deleted: false,
    $or: [{ owner: callerId }, { members: callerId }],
  })
    .select('workspaceId name type emoji owner members')
    .lean();

  return res.status(200).json({
    workspaces: workspaces.map((workspace) => ({
      workspaceId: workspace.workspaceId,
      name: getWorkspaceDisplayName(workspace),
      type: workspace.type,
      emoji: workspace.emoji || getDefaultWorkspaceEmoji(workspace.type),
      isOwner: workspace.owner.toString() === callerId.toString(),
      memberCount: new Set([
        workspace.owner.toString(),
        ...workspace.members.map((memberId) => memberId.toString()),
      ]).size,
    })),
  });
});

export const deleteWorkspace = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const requesterId = getCallerId(req);

  if (!requesterId) return res.status(401).json({ error: "Not authenticated" });

  const workspace = await Workspace.findOne(
    { workspaceId, deleted: false },
    { owner: 1, type: 1 }
  ).lean();
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });
  if (workspace.owner.toString() !== requesterId.toString()) {
    return res.status(403).json({ error: "Only the workspace owner can delete it" });
  }
  if (isDefaultWorkspaceType(workspace.type)) {
    return res.status(400).json({ error: "Default workspaces cannot be deleted" });
  }

  const now = Date.now();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Promise.all([
        Task.updateMany(
          { workspaceId, deleted: false },
          { $set: { deleted: true, deletedAt: now, updatedAt: now } },
          { session }
        ),
        Section.updateMany(
          { workspaceId, deleted: { $ne: true } },
          { $set: { deleted: true, deletedAt: now, updatedAt: now } },
          { session }
        ),
        WorkspaceInvite.deleteMany({ workspaceId }, { session }),
        Workspace.updateOne(
          { workspaceId, deleted: false },
          {
            $set: {
              deleted: true,
              deletedAt: now,
              updatedAt: now,
              members: [],
              lastChangedAt: now,
            },
            $inc: { syncVersion: 1 },
          },
          { session }
        ),
      ]);
    });
  } finally {
    await session.endSession();
  }

  req.app.get("wsServer")?.broadcastToWorkspace(workspaceId, {//websocket notification
    type: "WORKSPACE_DELETED",
    workspaceId,
  });

  return res.status(200).json({ ok: true });
});

export const inviteMember = asyncHandler(async (req, res) => {
  const { workspaceId, invitedEmail } = req.body;
  const inviterId = getCallerId(req);
  const normalizedEmail = String(invitedEmail ?? "").trim().toLowerCase();

  if (!workspaceId || !normalizedEmail) {
    return res.status(400).json({ error: "workspaceId and invitedEmail are required" });
  }

  const workspace = await Workspace.findOne({ workspaceId, deleted: false })
    .select('owner members name type')
    .lean();
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  const isAuthorised =
    workspace.owner.toString() === inviterId.toString() ||
    workspace.members.some((member) => member.toString() === inviterId.toString());
  if (!isAuthorised) {
    return res.status(403).json({ error: "Not authorised to invite" });
  }

  const invitedUser = await User.findOne({
    email: normalizedEmail,
    role: "user",
  })
    .select("_id email role")
    .lean();
  if (!invitedUser) {
    return res.status(404).json({ error: "User account not found for this email" });
  }

  if (workspace.owner.toString() === invitedUser._id.toString()) {
    return res.status(400).json({ error: "Workspace owner is already part of this workspace" });
  }

  const isAlreadyMember = workspace.members.some(
    (member) => member.toString() === invitedUser._id.toString()
  );
  if (isAlreadyMember) {
    return res.status(400).json({ error: "User is already a member of this workspace" });
  }

  await WorkspaceInvite.updateMany(//expire previous pending invites
    { workspaceId, invitedEmail: normalizedEmail, status: "pending" },
    { status: "expired" }
  );

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;//ttL

  await WorkspaceInvite.create({
    token,
    workspaceId,
    invitedBy: inviterId,
    invitedEmail: normalizedEmail,
    expiresAt,
  });

  const inviter = req.user.name ?? req.user.email ?? "A teammate";
  const inviteLink = `${process.env.FRONTEND_URL}/invite/accept?token=${token}`;

  await sendInviteEmail({
    to: normalizedEmail,
    inviterName: inviter,
    workspaceName: getWorkspaceDisplayName(workspace),
    inviteLink,
  });

  return res.status(200).json({ message: "Invite sent successfully" });
});

export const acceptInvite = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const userId = getCallerId(req);

  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  if (!token) return res.status(400).json({ error: "Token is required" });

  const invite = await WorkspaceInvite.findOne({ token })
    .select('workspaceId invitedEmail status expiresAt');

  if (!invite || invite.status !== "pending" || invite.expiresAt < Date.now()) {
    return res.status(410).json({ error: "Invite link is invalid or has expired" });
  }

  const callerEmail = req.user.email?.toLowerCase().trim();
  const callerName = req.user.name ?? callerEmail;

  if (!callerEmail) {
    return res
      .status(401)
      .json({ error: "Could not determine your email. Please log in again." });
  }

  if (invite.invitedEmail !== callerEmail) {
    return res.status(403).json({
      error: `This invite was sent to ${invite.invitedEmail}. You are logged in as ${callerEmail}.`,
    });
  }

  const workspace = await Workspace.findOne({ workspaceId: invite.workspaceId, deleted: false })
    .select('name type members updatedAt');
  if (!workspace) return res.status(404).json({ error: "Workspace no longer exists" });

  const alreadyMember = workspace.members.some((member) => member.equals(userId));
  if (!alreadyMember) {
    workspace.members.push(userId);
    workspace.updatedAt = Date.now();
    await workspace.save();
    await bumpWorkspaceSync(invite.workspaceId);
  }

  invite.status = "accepted";
  await invite.save();

  req.app.get("wsServer")?.broadcastToWorkspace(invite.workspaceId, {
    type: "MEMBER_JOINED",
    workspaceId: invite.workspaceId,
    userId: userId.toString(),
    email: callerEmail,
    name: callerName,
  });

  return res.status(200).json({
    message: "Joined workspace successfully",
    workspaceId: invite.workspaceId,
    workspaceName: getWorkspaceDisplayName(workspace),
  });
});

export const getMembers = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const requesterId = getCallerId(req);

  if (!requesterId) return res.status(401).json({ error: "Not authenticated" });

  const workspace = await Workspace.findOne({
    workspaceId,
    deleted: false,
    $or: [{ owner: requesterId }, { members: requesterId }],
  })
    .select("owner members")
    .lean();

  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  const ownerId = workspace.owner?.toString?.() ?? String(workspace.owner ?? "");
  const memberIds = Array.isArray(workspace.members)
    ? workspace.members.map((memberId) => memberId?.toString?.() ?? String(memberId ?? "")).filter(Boolean)
    : [];
  const userIds = [...new Set([ownerId, ...memberIds])];

  const users = await User.find(
    { _id: { $in: userIds } },
    "name email _id"
  ).lean();

  const usersById = new Map(users.map((user) => [user._id.toString(), user]));
  const owner = formatWorkspaceMember(
    usersById.get(ownerId) ?? { _id: ownerId, name: "Owner", email: "" }
  );

  const members = memberIds
    .map((memberId) =>
      formatWorkspaceMember(usersById.get(memberId) ?? { _id: memberId, name: "Member", email: "" })
    )
    .filter((member) => isWorkspaceMember(member) && member._id !== owner?._id);

  return res.status(200).json({
    owner,
    members,
  });
});

export const removeMember = asyncHandler(async (req, res) => {
  const { workspaceId, memberId } = req.params;
  const requesterId = getCallerId(req);

  const workspace = await Workspace.findOne({ workspaceId, deleted: false })
    .select('owner members updatedAt');
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  if (!workspace.owner.equals(requesterId)) {
    return res.status(403).json({ error: "Only the workspace owner can remove members" });
  }

  workspace.members = workspace.members.filter((member) => !member.equals(memberId));
  workspace.updatedAt = Date.now();
  await workspace.save();
  await bumpWorkspaceSync(workspaceId);

  req.app.get("wsServer")?.broadcastToWorkspace(workspaceId, {
    type: "MEMBER_REMOVED",
    workspaceId,
    userId: memberId,
  });

  return res.status(200).json({ message: "Member removed successfully" });
});

export const getPendingInvites = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const requesterId = getCallerId(req);

  const workspace = await Workspace.findOne({ workspaceId, deleted: false })
    .select("owner")
    .lean();
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  if (workspace.owner.toString() !== requesterId.toString()) {
    return res.status(403).json({ error: "Only the owner can view pending invites" });
  }

  const invites = await WorkspaceInvite.find({
    workspaceId,
    status: "pending",
    expiresAt: { $gt: Date.now() },
  })
    .select("token invitedEmail createdAt expiresAt")
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({ invites });
});

export const revokeInvite = asyncHandler(async (req, res) => {
  const { workspaceId, inviteToken } = req.params;
  const requesterId = getCallerId(req);

  const workspace = await Workspace.findOne({ workspaceId, deleted: false })
    .select("owner")
    .lean();
  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  if (workspace.owner.toString() !== requesterId.toString()) {
    return res.status(403).json({ error: "Only the owner can revoke invites" });
  }

  await WorkspaceInvite.updateOne(
    { token: inviteToken, workspaceId, status: "pending" },
    { status: "expired" }
  );

  return res.status(200).json({ message: "Invite revoked" });
});

export const getWorkspaceSyncState = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const requesterId = getCallerId(req);

  if (!requesterId) return res.status(401).json({ error: "Not authenticated" });

  const workspace = await Workspace.findOne({
    workspaceId,
    deleted: false,
    $or: [{ owner: requesterId }, { members: requesterId }],
  })
    .select("workspaceId syncVersion lastChangedAt")
    .lean();

  if (!workspace) return res.status(404).json({ error: "Workspace not found" });

  return res.status(200).json({
    workspaceId: workspace.workspaceId,
    syncVersion: workspace.syncVersion ?? 0,
    lastChangedAt: workspace.lastChangedAt ?? 0,
  });
});
