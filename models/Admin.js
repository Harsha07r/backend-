import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, LEGACY_ROLES } from '../config/rbac.js';

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: [...ROLES, ...LEGACY_ROLES], default: 'support' },
    isActive: { type: Boolean, default: true },
    // Bumped to invalidate every existing session (logout everywhere, role change, deactivate).
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

adminSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('Admin', adminSchema);
