import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './auth/auth.js';
import passport from './auth/passport.js'




const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.join(__dirname, '..', 'client');
export function createServer() {
  const app = express();


  app.use(cors({
      origin: ['http://localhost:5173', 'http://localhost:4000' ,'http://192.168.31.14:5173' , 'https://offinity-tasks-ujzs.onrender.com'],
      credentials: true 
    }));



  app.use(express.json({ limit: "10mb" }));//for Content-Type: application/json
  app.use(express.urlencoded({ limit: '10mb', extended: true }));


  // ── Passport ──────────────────────────────
  app.use(passport.initialize()); 

  //routes mounting
  app.use('/auth', authRoutes);//login,signup




  
  return { app,clientPath };
}
