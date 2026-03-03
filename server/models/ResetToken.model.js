import mongoose from 'mongoose';

const resetTokenSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  token:     { type: String, required: true, unique: true },
  expiresAt: { type: Date,   required: true },
  used:      { type: Boolean, default: false },
}, { versionKey: false });

// Auto delete after expiry
resetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ResetToken = mongoose.model('reset_tokens', resetTokenSchema);