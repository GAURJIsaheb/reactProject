import express from "express";
import { asyncHandler } from "../TryCatch/async.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { db } from "../mongo/mongo.js";

const router = express.Router();

// GET /sections
router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const { workspaceType } = req.query;
  const { userId } = req.user;

  const sections = await db.collection("sections")
    .find({ owner: userId, workspaceType: workspaceType ?? "personal" })
    .sort({ order: 1 })
    .toArray();

  res.json(sections);
}));

// POST /sections
router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const { id, title, workspaceType, order } = req.body;
  const { userId } = req.user;

  if (!id || !title) return res.status(400).json({ error: "id and title required" });

  const section = {
    sectionId: id,
    owner: userId,
    workspaceType: workspaceType ?? "personal",
    title,
    order: order ?? 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.collection("sections").insertOne(section);
  res.json({ ok: true, section });
}));

// PATCH /sections/:id
router.patch("/:id", requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, order } = req.body;
  const { userId } = req.user;

  const update = { updatedAt: Date.now() };
  if (title !== undefined) update.title = title;
  if (order !== undefined) update.order = order;

  await db.collection("sections").updateOne(
    { sectionId: id, owner: userId },
    { $set: update }
  );

  res.json({ ok: true });
}));

// DELETE /sections/:id
router.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  await db.collection("sections").deleteOne({ sectionId: id, owner: userId });

  // Unassign tasks that were in this section
  await db.collection("tasks").updateMany(
    { sectionId: id },
    { $set: { sectionId: null, updatedAt: Date.now() } }
  );

  res.json({ ok: true });
}));

export default router;