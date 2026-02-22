import express from "express";
import bcrypt from "bcrypt";
import { signToken, verifyToken } from "./jwt.js";
import { db } from "./mongo/mongo.js";

const router = express.Router();

/* SIGNUP */
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ error: "All fields required" });
  }

  const usersCol = db.collection("users");

  const existing = await usersCol.findOne({ email });
  if (existing) {
    return res.status(400).json({ error: "User already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = {
    email,
    name,
    password: hashed,
    createdAt: Date.now(),
  };

  await usersCol.insertOne(user);

  /* create default workspaces */
  const wsCol = db.collection("workspaces");

  await wsCol.insertOne({
    workspaceId: crypto.randomUUID(),
    type: "personal",
    owner: email,
    members: [email],
    createdAt: Date.now(),
  });

  await wsCol.insertOne({
    workspaceId: crypto.randomUUID(),
    type: "professional",
    owner: email,
    members: [email],
    createdAt: Date.now(),
  });

  const token = signToken({ email, name });

  res.json({
    token,
    user: { email, name },
  });
});

/* LOGIN */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email & password required" });
  }

  const usersCol = db.collection("users");
  const user = await usersCol.findOne({ email });

  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: "Wrong password" });
  }

  const token = signToken({ email: user.email, name: user.name });

  res.json({
    token,
    user: { email: user.email, name: user.name },
  });
});

/* ME */
router.get("/me", (req, res) => {
  const header = req.headers.authorization;
  if (!header) return res.json({ user: null });

  try {
    const token = header.split(" ")[1];
    const decoded = verifyToken(token);
    res.json({ user: decoded });
  } catch {
    res.json({ user: null });
  }
});

export default router;