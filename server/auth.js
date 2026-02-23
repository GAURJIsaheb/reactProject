import express from "express";
import bcrypt from "bcrypt";
import passport from "./passport/passport.js"; // ← change
import { signToken } from "./jwt.js";
import { db } from "./mongo/mongo.js";

const router = express.Router();

/* ── SIGNUP ── */
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !name || !password)
    return res.status(400).json({ error: "All fields required" });

  const usersCol = db.collection("users");
  const existing = await usersCol.findOne({ email });
  if (existing) return res.status(400).json({ error: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);
  await usersCol.insertOne({ email, name, password: hashed, createdAt: Date.now() });

  const wsCol = db.collection("workspaces");
  await wsCol.insertOne({ workspaceId: crypto.randomUUID(), type: "personal",      owner: email, members: [email], createdAt: Date.now() });
  await wsCol.insertOne({ workspaceId: crypto.randomUUID(), type: "professional",  owner: email, members: [email], createdAt: Date.now() });

  const token = signToken({ email, name });
  res.json({ token, user: { email, name } });
});

/* ── LOGIN — ab passport local strategy handle karega ── */
router.post(
  "/login",
  (req, res, next) => {
    passport.authenticate("local", { session: false }, (err, user, info) => {
      if (err) return next(err);
      if (!user)
        return res.status(401).json({ error: info?.message || "Login failed" });

      const token = signToken(user);
      return res.json({ token, user });
    })(req, res, next);
  }
);

/* ── ME ── */
router.get(
  "/me",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.json({ user: req.user });
  }
);

export default router;