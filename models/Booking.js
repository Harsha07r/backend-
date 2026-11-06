import mongoose from 'mongoose';
import { BOOKING_STATUSES } from '../validators/index.js';

// A "booking" is an enquiry: the customer asks for a tour, the team contacts
// them directly and updates the status. There is no pricing or payment.
const noteSchema = new mongoose.Schema(
  {
    by: { type: String, required: true },
    text: { type: String, required: true, maxlength: 1000 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    tourId: { type: String, required: true, trim: true, index: true }, // tour slug or legacy id
    tourName: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },

    travelDate: { type: Date, required: true },
    numberOfPeople: { type: Number, default: 1, min: 1, max: 50 },
    accommodationType: { type: String, default: 'Standard' },
    otherRequirements: { type: String },

    status: { type: String, enum: BOOKING_STATUSES, default: 'Pending', index: true },
    contactedAt: { type: Date },
    adminNotes: { type: String },
    notes: { type: [noteSchema], default: [] },
  },
  { timestamps: true }
);

bookingSchema.index({ tourId: 1, travelDate: 1 });
bookingSchema.index({ createdAt: -1 });

export default mongoose.model('Booking', bookingSchema);
