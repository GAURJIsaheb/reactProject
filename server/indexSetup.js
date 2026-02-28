import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './auth/auth.js';
import passport from './auth/passport.js'
import { requireAuth } from './middlewares/requireAuth.js';

import adminRoutes from './admin/admin.js';


//cron job admin routes
import cronAdminRouter from './cron/cronAdmin.routes.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.join(__dirname, '..', 'client');//.. means go 1 level up at project/frontend

export function createServer() {
  const app = express();


  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:4000'],
    credentials: true
  }));



  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use(session({
    name: 'todo.sid',
    secret: 'super-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 }
  }));

  // ── Passport ──────────────────────────────
  app.use(passport.initialize()); 


  app.use('/auth', authRoutes);//login,signup
  app.use('/admin', adminRoutes);


  
  app.use('/pages', express.static(path.join(clientPath, 'pages')));

  //cron job
  app.use('/admin/crons', requireAuth, cronAdminRouter);
  
  app.use(express.static(clientPath));

  return { app,clientPath };
}