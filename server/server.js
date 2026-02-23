
import path from 'path';

import { createServer } from './setup.js';
import { asyncHandler } from './TryCatch/async.js';
import { requireAuth } from './middlewares/requireAuth.js';
import { connectDB, db } from './mongo/mongo.js';

const { app, server,clientPath } = createServer();


// ─── Tasks CRUD ───────────────────────────────────────────────────────────────

// BULK CREATE
app.post('/tasks/bulk-create', requireAuth, asyncHandler(async (req, res) => {
  const { tasks } = req.body;
  if (!tasks?.length) return res.json({ ok: true });

  const col = db.collection("tasks");

  const docs = tasks.map(t => {
    const workspaceId = t.workspaceType === "professional"
      ? "pro_" + t.userEmail
      : "personal_" + t.userEmail;

    return {
      taskId:        t.id,
      workspaceId,
      text:          t.text,
      image:         t.image || null,
      completed:     t.completed  ?? false,
      archived:      t.archived   ?? false,
      deleted:       t.deleted    ?? false,
      createdBy:     t.userEmail,
      workspaceType: t.workspaceType,
      createdAt:     t.createdAt  ?? Date.now(),
      updatedAt:     t.updatedAt  ?? Date.now(),
      version: 1
    };
  });

  // ordered:false → duplicate taskId ho to skip karo, baaki insert karo
  await col.insertMany(docs, { ordered: false }).catch(err => {
    if (err.code !== 11000 && err.writeErrors?.some(e => e.code !== 11000)) throw err;
  });

  res.json({ ok: true, inserted: docs.length });
}));


// CREATE
app.post('/tasks', requireAuth, asyncHandler(async (req, res) => {
  const { id, text, image, workspaceType } = req.body;
  const { userId } = req.user; // ← req.body se nahi, req.user se lo

  if (!id || !userId)
    return res.status(400).json({ error: 'missing fields' });

  const workspace = await db.collection("workspaces").findOne({
    owner: userId,                  
    type: workspaceType ?? "personal"
  });
  if (!workspace) return res.status(404).json({ error: "workspace not found" });

  const col = db.collection("tasks");
  const exists = await col.findOne({ taskId: id });
  if (exists) return res.json({ status: 'ok' });

  const newTask = {
    taskId: id,
    workspaceId: workspace.workspaceId,
    text,
    image: image || null,
    completed: false,
    archived: false,
    deleted: false,
    createdBy: userId,              
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1
  };

  await col.insertOne(newTask);
  res.json({ status: 'ok', task: newTask });
}));


// READ ALL
app.get('/tasks', requireAuth, asyncHandler(async (req, res) => {
  const { workspaceType } = req.query;
  const { userId } = req.user; // ← req.user se lo

  const ws = await db.collection("workspaces").findOne({
    owner: userId,                   // ← userId
    type: workspaceType ?? "personal"
  });
  if (!ws) return res.json([]);

  const tasks = await db.collection("tasks")
    .find({ workspaceId: ws.workspaceId, deleted: false })
    .toArray();

  res.json(tasks);
}));



// BULK UPDATE
app.put('/tasks/bulk-update', requireAuth, asyncHandler(async (req, res) => {
  const { updates } = req.body;   // [{ taskId, payload }]
  if (!updates?.length) return res.json({ ok: true });

  const bulkOps = updates.map(({ taskId, payload }) => ({
    updateOne: {
      filter: { taskId },
      update: { $set: { ...payload, updatedAt: Date.now() } }
    }
  }));

  const result = await db.collection("tasks").bulkWrite(bulkOps, { ordered: false });
  res.json({ ok: true, modified: result.modifiedCount });
}));


// UPDATE
app.put('/tasks/:id', requireAuth, asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const { text, completed, archived, image } = req.body;

  const col = db.collection("tasks");
  const task = await col.findOne({ taskId });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  await col.updateOne({ taskId }, {
    $set: {
      text: text ?? task.text,
      image: image ?? task.image,
      completed: completed ?? task.completed,
      archived: archived ?? task.archived,
      updatedAt: Date.now(),
      version: (task.version || 1) + 1
    }
  });

  res.json({ status: 'ok' });
}));



// BULK DELETE (soft)
app.delete('/tasks/bulk-delete', requireAuth, asyncHandler(async (req, res) => {
  const { taskIds } = req.body;
  if (!taskIds?.length) return res.json({ ok: true });

  const result = await db.collection("tasks").updateMany(
    { taskId: { $in: taskIds } },
    { $set: { deleted: true, updatedAt: Date.now() } }
  );

  res.json({ ok: true, deleted: result.modifiedCount });
}));

// DELETE (soft)
app.delete('/tasks/:id', requireAuth, asyncHandler(async (req, res) => {
  const taskId = req.params.id;

  await db.collection("tasks").updateOne(
    { taskId },
    { $set: { deleted: true, updatedAt: Date.now() } }
  );

  res.json({ status: 'ok' });
}));


// ─── Archive Routes ────────────────────────────────────────────────────────────

// POST /archive/bulk — encrypt karke multiple tasks archive karo
app.post('/archive/bulk', requireAuth, asyncHandler(async (req, res) => {
  const { tasks } = req.body;
  const { userId } = req.user; // ← req.user se lo

  if (!Array.isArray(tasks) || tasks.length === 0)
    return res.status(400).json({ error: 'tasks array required' });

  // workspace bhi dhundho
  const workspace = await db.collection("workspaces").findOne({
    owner: userId,
    type: tasks[0]?.workspaceType ?? "personal"
  });

  const col = db.collection("archive");
  const docs = tasks.map(t => ({
    _id: t.id,
    userId,                          // ← userId
    workspaceId: workspace?.workspaceId, // ← actual workspaceId
    encryptedPayload: t.encryptedPayload,
    archivedAt: t.archivedAt,
    restoredAt: null,
  }));

  await col.insertMany(docs, { ordered: false }).catch(err => {
    if (err.code !== 11000 && err.writeErrors?.some(e => e.code !== 11000)) throw err;
  });

  const taskIds = tasks.map(t => t.id);
  await db.collection("tasks").updateMany(
    { taskId: { $in: taskIds } },
    { $set: { archived: true, updatedAt: Date.now() } }
  );

  res.json({ ok: true });
}));



// PATCH /archive/restore-all — pehle aana chahiye warna :id match kar leta hai
app.patch('/archive/restore-all', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = req.user; // ← req.user se lo

  const archived = await db.collection("archive")
    .find({ userId, restoredAt: null })    // ← userId
    .toArray();

  await db.collection("archive").updateMany(
    { userId, restoredAt: null },
    { $set: { restoredAt: Date.now() } }
  );

  const taskIds = archived.map(a => a._id);
  if (taskIds.length > 0) {
    await db.collection("tasks").updateMany(
      { taskId: { $in: taskIds } },
      { $set: { archived: false, updatedAt: Date.now() } }
    );
  }

  res.json({ ok: true });
}));


// PATCH /archive/:id/restore — single task restore (soft delete in archive)
app.patch('/archive/:id/restore', requireAuth, asyncHandler(async (req, res) => {
  const id = req.params.id;

  // archive collection mein restoredAt set karo
  await db.collection("archive").updateOne(
    { _id: id },
    { $set: { restoredAt: Date.now() } }
  );

  // tasks collection mein archived:false wapas karo
  await db.collection("tasks").updateOne(
    { taskId: id },
    { $set: { archived: false, updatedAt: Date.now() } }
  );

  res.json({ ok: true });
}));


// GET /archive?
app.get('/archive', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = req.user; // ← req.user se lo

  const tasks = await db.collection("archive")
    .find({ userId, restoredAt: null })    // ← userId
    .toArray();

  res.json({ tasks });
}));


// ─── Static / Error ───────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});


// ─── Start ────────────────────────────────────────────────────────────────────

async function start() {
  await connectDB();
  server.listen(4000, () => console.log('Server on 4000 + Mongo'));
}

start();
