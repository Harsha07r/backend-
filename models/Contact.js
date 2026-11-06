import mongoose from 'mongoose';
import { CONTACT_STATUSES } from '../validators/index.js';

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    message: { type: String, required: true },
    status: { type: String, enum: CONTACT_STATUSES, default: 'New', index: true },
    date: { type: Date, default: Date.now }, // kept for records created before timestamps
  },
  { timestamps: true }
);

export default mongoose.model('Contact', contactSchema);
