import { Section } from "../models/Section.model.js";
import { Task }    from "../models/Task.model.js";

// Build a Mongoose filter depending on whether this is a collab workspace.
// Collab → filter by workspaceId (any member can touch it).
// Personal → filter by owner + workspaceType (original behaviour, unchanged).
function wsFilter(req, extra = {}) {
  const { workspaceType, workspaceId } = { ...req.query, ...req.body };
  const { userId } = req.user;
  if (workspaceId) return { workspaceId, deleted: { $ne: true }, ...extra };
  return { owner: userId, workspaceType: workspaceType ?? "personal", ...extra };
}

/* GET /sections/sync ------------------------------------------------------- */
export async function syncSections(req, res) {
  const { lastSyncedAt } = req.query;
  const since  = lastSyncedAt ? Number(lastSyncedAt) : 0;
  const filter = wsFilter(req, { updatedAt: { $gt: since } });

  const sections = await Section.find(filter).sort({ order: 1 }).lean();
  return res.json({
    sections: sections.map((s) => ({ ...s, id: s.sectionId })),
    syncedAt: Date.now(),
  });
}

/* GET /sections ------------------------------------------------------------ */
export async function getSections(req, res) {
  const filter   = wsFilter(req, { deleted: { $ne: true } });
  const sections = await Section.find(filter).sort({ order: 1 }).lean();
  return res.json(sections);
}

/* POST /sections ----------------------------------------------------------- */
export async function createSection(req, res) {
  const { id, title, workspaceType, workspaceId, order } = req.body;
  const { userId } = req.user;

  if (!id || !title) return res.status(400).json({ error: "id and title required" });

  const section = await Section.create({
    _id:           id,
    sectionId:     id,
    owner:         userId,
    workspaceType: workspaceType ?? "personal",
    workspaceId:   workspaceId ?? null,
    title,
    order:         order ?? 0,
  });

  // Broadcast to collab peers so they see the new section in real-time
  if (workspaceId) {
    req.app.get("wsServer")?.broadcastToWorkspace(workspaceId, {
      type:       "SECTION_CREATE",
      workspaceId,
      section:    { ...section.toObject(), id: section.sectionId },
    });
  }

  return res.json({ ok: true, section });
}

/* PATCH /sections/:id ------------------------------------------------------ */
export async function updateSection(req, res) {
  const { id }                        = req.params;
  const { title, order, workspaceId } = req.body;
  const { userId }                    = req.user;

  const filter = workspaceId
    ? { sectionId: id, workspaceId, deleted: { $ne: true } }
    : { sectionId: id, owner: userId, deleted: { $ne: true } };

  const update = { updatedAt: Date.now() };
  if (title !== undefined) update.title = title;
  if (order !== undefined) update.order = order;

  const updated = await Section
    .findOneAndUpdate(filter, { $set: update }, { new: true })
    .lean();

  if (workspaceId && updated) {
    req.app.get("wsServer")?.broadcastToWorkspace(workspaceId, {
      type:       "SECTION_UPDATE",
      workspaceId,
      section:    { ...updated, id: updated.sectionId },
    });
  }

  return res.json({ ok: true });
}

/* DELETE /sections/:id ----------------------------------------------------- */
export async function deleteSection(req, res) {
  const { id }          = req.params;
  const { workspaceId } = req.body;
  const { userId }      = req.user;

  const now    = Date.now();
  const filter = workspaceId
    ? { sectionId: id, workspaceId, deleted: { $ne: true } }
    : { sectionId: id, owner: userId, deleted: { $ne: true } };

  await Section.updateOne(filter, { $set: { deleted: true, deletedAt: now, updatedAt: now } });

  // Soft-delete tasks in this section
  const taskFilter = workspaceId
    ? { sectionId: id, deleted: false }
    : { sectionId: id, createdBy: userId, deleted: false };
  await Task.updateMany(taskFilter, { $set: { deleted: true, deletedAt: now, updatedAt: now } });

  if (workspaceId) {
    req.app.get("wsServer")?.broadcastToWorkspace(workspaceId, {
      type: "SECTION_DELETE",
      workspaceId,
      sectionId: id,
    });
  }

  return res.json({ ok: true });
}
