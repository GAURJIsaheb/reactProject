import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './auth/auth.js';
import passport from './auth/passport.js'
import { requireAuth } from './middlewares/requireAuth.js';


//cron job admin routes
import cronAdminRouter from './cron/cronAdmin.routes.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.join(__dirname, '..', 'client');
export function createServer() {
  const app = express();


  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:4000' ,'http://192.168.31.14:5173'],
    credentials: true
  }));



  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use(session({
    name: 'todo.sid',
    secret:process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: false,//lazy allocation for sessions.
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 }
  }));

  // ── Passport ──────────────────────────────
  app.use(passport.initialize()); 

  //routes mounting

  app.use('/auth', authRoutes);//login,signup



  //cron job
  app.use('/admin/crons', requireAuth, cronAdminRouter);
  
  return { app,clientPath };
}