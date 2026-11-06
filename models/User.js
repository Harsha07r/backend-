import mongoose from 'mongoose';

// Password strength is enforced by the zod validator *before* hashing; the
// stored value is always a bcrypt hash, so no schema-level rule can apply here.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    profilePhoto: { type: String, default: '' },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
