import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  name:      { type: String, required: true, trim: true },
  password:  { type: String, default: null },       // null for OAuth
  provider:  { type: String, enum: ['local', 'google', 'github'], default: 'local' },
  providerId:{ type: String, default: null },
  avatar:    { type: String, default: null },
  role:      { type: String, enum: ['user', 'superadmin'], default: 'user' },
  createdAt: { type: Number, default: () => Date.now() },
  updatedAt: { type: Number, default: () => Date.now() },
}, { versionKey: false });

export const User = mongoose.model('users', userSchema);