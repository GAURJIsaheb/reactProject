import taskRoutes from './tasks.routes.js';
import archiveRoutes from './archive.routes.js';
import sectionRoutes from './sections.routes.js';
import notificationRoutes from './notifications.routes.js';
import passwordRoutes from './password.routes.js'; 
import adminRoutes from './admin.routes.js'
import cronAdminRouter from './cronAdmin.routes.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireSuperAdmin } from '../middlewares/requireSuperAdmin.js';

export function registerRoutes(app) {
  app.use('/password', passwordRoutes);//public routes,,bcz we have public endpoints like forgot password

  //protected routes
  app.use(requireAuth);
  app.use('/tasks', taskRoutes);
  app.use('/archive', archiveRoutes);
  app.use('/sections', sectionRoutes);
  app.use('/notifications', notificationRoutes);

  app.use('/admin',           requireSuperAdmin,adminRoutes);
  app.use('/admin/crons',     requireSuperAdmin,cronAdminRouter);
}
