import express from "express";
import { asyncHandler } from "../TryCatch/async.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { Section } from "../models/Section.model.js";
import { Task }    from "../models/Task.model.js";

const router = express.Router();
// GET /sections/sync?workspaceType=personal&lastSyncedAt=timestamp
router.get("/sync", requireAuth, asyncHandler(async (req, res) => {
  const { workspaceType, lastSyncedAt } = req.query;
  const { userId } = req.user;
  const since = lastSyncedAt ? Number(lastSyncedAt) : 0;

  const sections = await Section
    .find({
      owner: userId,
      workspaceType: workspaceType ?? "personal",
      updatedAt: { $gt: since },
    })
    .sort({ order: 1 })
    .lean();

  // Map sectionId → id for IDB keyPath
  const mapped = sections.map((s) => ({
    ...s,
    id: s.sectionId,
  }));

  res.json({
    sections: mapped,
    syncedAt: Date.now(),
  });
}));

// GET /sections
router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const { workspaceType } = req.query;
  const { userId } = req.user;

  const sections = await Section
    .find({ owner: userId, workspaceType: workspaceType ?? "personal" })
    .sort({ order: 1 })
    .lean();

  res.json(sections);
}));

// POST /sections
router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const { id, title, workspaceType, order } = req.body;
  const { userId } = req.user;

  if (!id || !title) return res.status(400).json({ error: "id and title required" });

  const section = await Section.create({
    sectionId:     id,
    owner:         userId,
    workspaceType: workspaceType ?? "personal",
    title,
    order:         order ?? 0,
  });

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

  await Section.updateOne({ sectionId: id, owner: userId }, { $set: update });

  res.json({ ok: true });
}));

// DELETE /sections/:id
router.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  await Section.deleteOne({ sectionId: id, owner: userId });
  await Task.updateMany({ sectionId: id }, { $set: { sectionId: null, updatedAt: Date.now() } });

  res.json({ ok: true });
}));

export default router;