import taskRoutes from './tasks.routes.js';
import archiveRoutes from './archive.routes.js';
import sectionRoutes from './sections.routes.js';
import passwordRoutes from './password.routes.js'; 
import adminRoutes from './admin.routes.js'
export function registerRoutes(app) {
  app.use('/tasks', taskRoutes);
  app.use('/archive', archiveRoutes);
  app.use('/sections', sectionRoutes);
  app.use('/password', passwordRoutes);
   app.use('/admin',    adminRoutes);
}