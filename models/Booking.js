const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  tourId: { type: String, required: true },
  tourName: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },

  travelDate: { type: String, required: true },
  numberOfPeople: { type: Number, default: 1 },
  accommodationType: { type: String, default: 'Standard' },
  otherRequirements: { type: String },

  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Rejected', 'Cancelled'],
    default: 'Pending'
  },

  adminNotes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
