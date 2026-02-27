
import { createServer } from './indexSetup.js';
import { registerRoutes } from './routes/index.js';
import { connectDB } from './mongo/mongo.js';
import { registerCronJobs } from './cron/cleanupJobs.js';

import path from 'path';

const { app, server, clientPath } = createServer();

registerRoutes(app);

app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

async function start() {
  await connectDB();
  registerCronJobs();   // ← after DB is ready, before listen
  server.listen(4000, () => console.log('Server on 4000 + Mongo'));
}

start();