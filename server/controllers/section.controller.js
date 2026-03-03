import { Section } from "../models/Section.model.js";
import { Task } from "../models/Task.model.js";

/* GET /sections/sync*/
export async function syncSections(req, res) {
  const { workspaceType, lastSyncedAt } = req.query;
  const { userId } = req.user;

  const since = lastSyncedAt ? Number(lastSyncedAt) : 0;

  const sections = await Section.find({//using this indexing:sectionSchema.index({ owner: 1, workspaceType: 1, order: 1 });
    owner: userId,
    workspaceType: workspaceType ?? "personal",
    updatedAt: { $gt: since },
  })
    .sort({ order: 1 })
    .lean();

  // Map sectionId → id (for IndexedDB keyPath compatibility)
  const mapped = sections.map((s) => ({
    ...s,
    id: s.sectionId,
  }));

  return res.json({
    sections: mapped,
    syncedAt: Date.now(),
  });
}

/* GET /sections*/
export async function getSections(req, res) {
  const { workspaceType } = req.query;
  const { userId } = req.user;

  const sections = await Section.find({
    owner: userId,
    workspaceType: workspaceType ?? "personal",
  })
    .sort({ order: 1 })
    .lean();

  return res.json(sections);
}

/*POST /sections */
export async function createSection(req, res) {
  const { id, title, workspaceType, order } = req.body;
  const { userId } = req.user;

  if (!id || !title) {
    return res.status(400).json({ error: "id and title required" });
  }

  const section = await Section.create({
    sectionId: id,
    owner: userId,
    workspaceType: workspaceType ?? "personal",
    title,
    order: order ?? 0,
  });

  return res.json({ ok: true, section });
}

/* PATCH /sections/:id*/
export async function updateSection(req, res) {
  const { id } = req.params;
  const { title, order } = req.body;
  const { userId } = req.user;

  const update = {
    updatedAt: Date.now(),
  };

  if (title !== undefined) update.title = title;
  if (order !== undefined) update.order = order;

  await Section.updateOne(
    { sectionId: id, owner: userId },
    { $set: update }
  );

  return res.json({ ok: true });
}

/*DELETE /sections/:id */
export async function deleteSection(req, res) {
  const { id } = req.params;
  const { userId } = req.user;

  await Section.deleteOne({ sectionId: id, owner: userId });

  // Detach tasks also from deleted section
  await Task.updateMany(
    { sectionId: id },
    { $set: { sectionId: null, updatedAt: Date.now() } }
  );

  return res.json({ ok: true });
}