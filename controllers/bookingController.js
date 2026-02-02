const Booking = require('../models/Booking');
const { sendBookingConfirmation, sendStatusUpdate } = require('../services/emailService');

/* Helper */
const normalizeDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
};

/* CREATE BOOKING */
async function createBooking(req, res) {
  try {
    console.log('Incoming booking request:', req.body);

    const {
      tourId,
      tourName,
      fullName,
      email,
      phone = '',
      travelDate,
      numberOfPeople = 1,
      accommodationType = 'Standard',
      otherRequirements = ''
    } = req.body;

    // ✅ Required fields check
    if (!tourId || !fullName || !email || !travelDate) {
      console.error('Missing fields:', { tourId, fullName, email, travelDate });
      return res.status(400).json({
        success: false,
        message: 'Required booking information missing'
      });
    }

    const day = normalizeDate(travelDate);
    if (!day) {
      return res.status(400).json({
        success: false,
        message: 'Invalid travel date'
      });
    }

    const capacity = process.env.DEFAULT_TOUR_CAPACITY
      ? parseInt(process.env.DEFAULT_TOUR_CAPACITY, 10)
      : 3;

    const existingBookings = await Booking.countDocuments({
      tourId,
      travelDate: day
    });

    if (existingBookings >= capacity) {
      return res.status(409).json({
        success: false,
        message: `Tour fully booked for ${day}`
      });
    }

    const booking = await Booking.create({
      tourId,
      tourName,
      fullName,
      email,
      phone,
      travelDate: day,
      numberOfPeople,
      accommodationType,
      otherRequirements,
      status: 'Pending'
    });

    try {
      await sendBookingConfirmation(booking);
    } catch (e) {
      console.error('Email error:', e);
    }

    return res.status(201).json({ success: true, booking });

  } catch (err) {
    console.error('Create booking error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* CHECK AVAILABILITY */
async function checkAvailability(req, res) {
  try {
    const { tourId } = req.params;
    const { date } = req.query;

    const day = normalizeDate(date);
    if (!tourId || !day) {
      return res.status(400).json({
        success: false,
        message: 'tourId and date required'
      });
    }

    const bookedCount = await Booking.countDocuments({
      tourId,
      travelDate: day
    });

    const cap = process.env.DEFAULT_TOUR_CAPACITY
      ? parseInt(process.env.DEFAULT_TOUR_CAPACITY, 10)
      : 3;

    return res.json({
      success: true,
      bookedCount,
      capacity: cap,
      isAvailable: bookedCount < cap
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}


// List all bookings (admin usage)
async function listBookings(req, res) {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    return res.json({ success: true, bookings });
  } catch (err) {
    console.error('List bookings error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  createBooking,
  checkAvailability,
  listBookings,
  updateBookingStatus
};
