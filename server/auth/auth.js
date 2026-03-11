import crypto from "crypto";
import express from "express";
import bcrypt from "bcrypt";
import passport from "./passport.js";
import { signToken } from "./jwt.js";

import { User } from "../models/User.model.js";
import { Workspace } from "../models/Workspace.model.js";
import { loginRateLimiter } from "../middlewares/rateLimiter.js";
import { getDefaultWorkspaceEmoji } from "../utils/workspaceDefaults.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
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
            type: "personal",
            emoji: getDefaultWorkspaceEmoji("personal"),
            owner: user._id,
            members: [user._id],
          },
          {
            workspaceId: crypto.randomUUID(),
            type: "professional",
            emoji: getDefaultWorkspaceEmoji("professional"),
            owner: user._id,
            members: [user._id],
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
  res.json({ token, user: { email, name, userId, role } });
});

router.post("/login", loginRateLimiter, (req, res, next) => {
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: info?.message || "Login failed" });
    }

    const token = signToken(user);
    return res.json({ token, user });
  })(req, res, next);
});

router.get(
  "/me",
  passport.authenticate("jwt", { session: false }),
  (req, res) => res.json({ user: req.user })
);

router.get(
  "/role",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { userId } = req.user;
      const user = await User.findById(userId).select("role").lean();
      res.json({ role: user?.role ?? "user" });
    } catch (err) {
      console.error("Role fetch error:", err);
      res.status(500).json({ error: "Could not fetch role" });
    }
  }
);

export default router;
