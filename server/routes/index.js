import taskRoutes from './tasks.routes.js';
import archiveRoutes from './archive.routes.js';

export function registerRoutes(app) {
  app.use('/tasks', taskRoutes);
  app.use('/archive', archiveRoutes);
}