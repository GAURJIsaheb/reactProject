import "../config/env.js";

import mongoose from 'mongoose';
import dns from 'dns';

dns.setServers(['1.1.1.1', '8.8.8.8']);

export async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI, {
    family: 4,   // force IPv4
  });
  console.log('MongoDB connected');
}

export const db = mongoose.connection;
