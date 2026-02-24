import express from "express";
import bcrypt from "bcrypt";
import passport from "./passport/passport.js";
import { signToken } from "./jwt.js";
import { db } from "./mongo/mongo.js";
import { ObjectId } from "mongodb"; 

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
  
  // ← pehle insert, phir _id lo
  const result = await usersCol.insertOne({ 
    email, name, password: hashed, createdAt: Date.now() 
  });
  const userId = result.insertedId.toString(); // ← real userId

  const wsCol = db.collection("workspaces");
  await wsCol.insertOne({ 
    workspaceId: crypto.randomUUID(), 
    type: "personal",      
    owner: userId,       // ← email nahi
    members: [userId],   // ← email nahi
    createdAt: Date.now() 
  });
  await wsCol.insertOne({ 
    workspaceId: crypto.randomUUID(), 
    type: "professional",  
    owner: userId,       // ← email nahi
    members: [userId],   // ← email nahi
    createdAt: Date.now() 
  });

  const token = signToken({ email, name, userId }); // ← userId bhi
  res.json({ token, user: { email, name, userId } });
});

/* ── LOGIN ── */
router.post(
  "/login",
  (req, res, next) => {
    passport.authenticate("local", { session: false }, (err, user, info) => {
      if (err) return next(err);
      if (!user)
        return res.status(401).json({ error: info?.message || "Login failed" });

      const token = signToken(user); // user mein ab userId bhi hai
      return res.json({ token, user }); // ← userId automatically aayega
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

router.get(
  "/role",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { userId } = req.user;
      const user = await db.collection("users").findOne(
        { _id: new ObjectId(userId) },
        { projection: { role: 1 } }
      );
      res.json({ role: user?.role ?? "user" });
    } catch (err) {
      console.error("Role fetch error:", err);
      res.status(500).json({ error: "Could not fetch role" });
    }
  }
);


export default router;