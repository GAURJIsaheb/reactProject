
import path from 'path';

import { createServer } from './setup.js';
import { asyncHandler } from './TryCatch/async.js';
import { requireAuth } from './middlewares/requireAuth.js';
import { connectDB, db } from './mongo/mongo.js';

const { app, server,clientPath } = createServer();


// ─── Tasks CRUD ───────────────────────────────────────────────────────────────

// CREATE
app.post('/tasks', requireAuth, asyncHandler(async (req, res) => {
  const { id, text, image, userEmail, workspaceType } = req.body;

  if (!id || !userEmail)
    return res.status(400).json({ error: 'missing fields' });

  const workspaceId =
    workspaceType === "professional"
      ? "pro_" + userEmail
      : "personal_" + userEmail;

  const col = db.collection("tasks");

  const exists = await col.findOne({ taskId: id });
  if (exists) return res.json({ status: 'ok' });

  const newTask = {
    taskId: id,
    workspaceId,
    text,
    image: image || null,
    completed: false,
    archived: false,
    deleted: false,
    createdBy: userEmail,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1
  };

  await col.insertOne(newTask);
  res.json({ status: 'ok', task: newTask });
}));


// READ ALL
app.get('/tasks', requireAuth, asyncHandler(async (req, res) => {
  const { userEmail, workspaceType } = req.query;

  if (!userEmail)
    return res.status(400).json({ error: "userEmail required" });

  const ws = await db.collection("workspaces").findOne({
    owner: userEmail,
    type: workspaceType
  });

  if (!ws) return res.json([]);

  const tasks = await db.collection("tasks")
    .find({ workspaceId: ws.workspaceId, deleted: false })
    .toArray();

  res.json(tasks);
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

  if (!Array.isArray(tasks) || tasks.length === 0)
    return res.status(400).json({ error: 'tasks array required' });

  const col = db.collection("archive");

  const docs = tasks.map(t => ({
    _id: t.id,          // task id hi _id hai, duplicates skip honge
    userEmail: t.userEmail,
    workspaceType: t.workspaceType,
    encryptedPayload: t.encryptedPayload,
    archivedAt: t.archivedAt,
    restoredAt: null,
  }));

  // ordered:false → ek duplicate se poora bulk fail na ho
  await col.insertMany(docs, { ordered: false }).catch(err => {
    // 11000 = duplicate key — safe to ignore
    if (err.code !== 11000 && err.writeErrors?.some(e => e.code !== 11000)) {
      throw err;
    }
  });

  // tasks collection mein bhi archived:true mark karo
  const taskIds = tasks.map(t => t.id);
  await db.collection("tasks").updateMany(
    { taskId: { $in: taskIds } },
    { $set: { archived: true, updatedAt: Date.now() } }
  );

  res.json({ ok: true });
}));


// PATCH /archive/restore-all — pehle aana chahiye warna :id match kar leta hai
app.patch('/archive/restore-all', requireAuth, asyncHandler(async (req, res) => {
  const { userEmail } = req.body;

  if (!userEmail)
    return res.status(400).json({ error: 'userEmail required' });

  // archive collection mein saare restoredAt set karo
  const archived = await db.collection("archive")
    .find({ userEmail, restoredAt: null })
    .toArray();

  await db.collection("archive").updateMany(
    { userEmail, restoredAt: null },
    { $set: { restoredAt: Date.now() } }
  );

  // tasks collection mein saare archived:false karo
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


// GET /archive?userEmail=x — active (non-restored) archives fetch karo
app.get('/archive', requireAuth, asyncHandler(async (req, res) => {
  const { userEmail } = req.query;

  if (!userEmail)
    return res.status(400).json({ error: 'userEmail required' });

  const tasks = await db.collection("archive")
    .find({ userEmail, restoredAt: null })
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
