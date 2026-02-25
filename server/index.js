import { createServer } from './setup.js';
import { registerRoutes } from './routes/index.js';
import { connectDB } from './mongo/mongo.js';
import path from 'path';

const { app, server, clientPath } = createServer();

// ─── Routes ───────────────────────────────────────────────────────────────────
registerRoutes(app);

// ─── Static ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
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