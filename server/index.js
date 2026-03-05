import { createServer } from './indexSetup.js';
import { registerRoutes } from './routes/index.js';
import { connectDB } from './mongo/mongo.js';
import { registerCronJobs } from './cron/cleanupJobs.js';
import { startConsumer } from './sqs/sqsConsumer.js';
import path from 'path';

const { app, clientPath } = createServer();

registerRoutes(app); //register routes

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

async function start() {
  await connectDB();
  registerCronJobs();
  startConsumer();//email
  app.listen(4000, () => console.log('Server on 4000 + Mongo'));
}

start();




























/*
0.0.0.0 means:
Accept connections from anywhere that can reach this machine.”

That includes:

Other devices on your WiFi

Docker containers
 */