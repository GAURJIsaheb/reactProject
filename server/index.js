import { createServer }    from './indexSetup.js';
import { registerRoutes }   from './routes/index.js';
import { connectDB }        from './mongo/mongo.js';
import { startConsumer }    from './sqs/sqsConsumer.js';
import { CollabWsServer }   from './websocket/wsServer.js';      
import path from 'path';

const { app, clientPath } = createServer();

registerRoutes(app);

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

async function start() {
  await connectDB();
  startConsumer();///sqs

  // Use http.createServer so WS and HTTP share the same port
  const { createServer: createHttpServer } = await import('http');
  const httpServer = createHttpServer(app);

  // Attach WebSocket server
  const wsServer = new CollabWsServer(httpServer);
  wsServer.startHeartbeat();
  app.set('wsServer', wsServer); //so any route can access wsServer                           

  httpServer.listen(4000, () =>
    console.log('Server on 4000 + Mongo + WebSocket')
  );
}

start();
