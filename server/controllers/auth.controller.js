import crypto from "crypto";
import bcrypt from "bcrypt";
import passport from "../auth/passport.js";
import { signToken } from "../auth/jwt.js";
import { User } from "../models/User.model.js";
import { Workspace } from "../models/Workspace.model.js";
import {deleteImageFromS3,generateSignedUrl,uploadImageToS3,} from "../s3/s3Service.js";
import {getDefaultWorkspaceEmoji,getDefaultWorkspaceName,} from "../utils/workspaceDefaults.js";

async function buildAuthUserPayload(userDoc) {
  if (!userDoc) return null;

  let avatarUrl = null;
  if (userDoc.avatar) {
    avatarUrl = await generateSignedUrl(userDoc.avatar);
  }

  return {
    email: userDoc.email,
    name: userDoc.name,
    userId: userDoc._id.toString(),
    role: userDoc.role ?? "user",
    avatarUrl,
  };
}

export async function signup(req, res) {
  const { name, email, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({ error: "All fields required" });
  }

  const existing = await User.exists({ email });
  if (existing) return res.status(400).json({ error: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);
  const session = await User.startSession();
  let user;

  try {
    await session.withTransaction(async () => {
      const createdUsers = await User.create(
        [{ email, name, password: hashed }],
        { session }
      );
      user = createdUsers[0];

      await Workspace.insertMany(
        [
          {
            workspaceId: crypto.randomUUID(),
            name: getDefaultWorkspaceName("personal"),
            type: "personal",
            emoji: getDefaultWorkspaceEmoji("personal"),
            owner: user._id,
            members: [],
          },
          {
            workspaceId: crypto.randomUUID(),
            name: getDefaultWorkspaceName("professional"),
            type: "professional",
            emoji: getDefaultWorkspaceEmoji("professional"),
            owner: user._id,
            members: [],
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  if (!user) return res.status(500).json({ error: "Signup failed" });

  const userId = user._id.toString();
  const role = user.role ?? "user";
  const token = signToken({ email, name, userId, role });
  res.json({
    token,
    user: {
      email,
      name,
      userId,
      role,
      avatarUrl: null,
    },
  });
}

export function login(req, res, next) {
  passport.authenticate("local", { session: false }, async (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: info?.message || "Login failed" });
    }

    const freshUser = await User.findById(user.userId)
      .select("email name role avatar")
      .lean();
    if (!freshUser) {
      return res.status(404).json({ error: "User no longer exists" });
    }

    const token = signToken(user);
    return res.json({ token, user: await buildAuthUserPayload(freshUser) });
  })(req, res, next);
}

export async function getCurrentUser(req, res) {
  const user = await User.findById(req.user.userId)
    .select("email name role avatar")
    .lean();
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ user: await buildAuthUserPayload(user) });
}

export async function getCurrentUserRole(req, res) {
  try {
    const { userId } = req.user;
    const user = await User.findById(userId).select("role").lean();
    res.json({ role: user?.role ?? "user" });
  } catch (err) {
    console.error("Role fetch error:", err);
    res.status(500).json({ error: "Could not fetch role" });
  }
}

export async function uploadProfileAvatar(req, res) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (!req.file) {
    return res.status(400).json({ error: "Avatar image is required" });
  }

  const user = await User.findById(userId).select("email name role avatar");
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const previousAvatarKey = user.avatar;
  const nextAvatarKey = await uploadImageToS3(
    req.file.buffer,
    req.file.mimetype,
    userId,
    "avatars"
  );

  user.avatar = nextAvatarKey;
  user.updatedAt = Date.now();
  await user.save();

  if (previousAvatarKey) {
    await deleteImageFromS3(previousAvatarKey).catch(() => {});
  }

  res.json({ user: await buildAuthUserPayload(user.toObject()) });
}
