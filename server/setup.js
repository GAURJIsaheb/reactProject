import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './auth.js';
import passport from "./passport/passport.js"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.join(__dirname, '..', 'client');

export function createServer() {
  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:4000'],
      credentials: true
    }
  });

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
  app.use(passport.initialize()); // ← ADD (session use nahi kar rahe JWT ke saath)

  app.use('/auth', authRoutes);
  app.use('/pages', express.static(path.join(clientPath, 'pages')));
  app.use(express.static(clientPath));

  return { app, server, io, clientPath };
}