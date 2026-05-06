import Booking from '../models/Booking.js';
import { sendUserConfirmation, sendStatusUpdate } from '../services/emailService.js';

/* Helper */
const normalizeDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
};

/* CREATE BOOKING */
export const createBooking = async (req, res) => {
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
      await sendUserConfirmation(booking);
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
export const checkAvailability = async (req, res) => {
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

// Update booking status (admin usage)
export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!bookingId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID and status are required'
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    try {
      await sendStatusUpdate(booking);
    } catch (e) {
      console.error('Email error:', e);
    }

    return res.json({ success: true, booking });

  } catch (err) {
    console.error('Update booking status error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

// List all bookings (admin usage)
export const listBookings = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const bookings = await Booking.find(filter).sort({ createdAt: -1 });

    const [total, pending, confirmed, rejected] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'Pending' }),
      Booking.countDocuments({ status: 'Confirmed' }),
      Booking.countDocuments({ status: 'Rejected' })
    ]);

    return res.json({
      success: true,
      bookings,
      stats: { total, pending, confirmed, rejected }
    });
  } catch (err) {
    console.error('List bookings error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
