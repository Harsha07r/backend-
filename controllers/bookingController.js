import Booking from '../models/Booking.js';
import {
  sendUserConfirmation,
  sendStatusUpdate
} from '../services/emailService.js';

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

    /* Validation */
    if (!tourId || !fullName || !email || !travelDate) {
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

    /* Capacity */
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

    /* Create booking */
    const booking = await Booking.create({
      tourId,
      tourName,
      fullName,
      email: email.trim().toLowerCase(),
      phone,
      travelDate: day,
      numberOfPeople,
      accommodationType,
      otherRequirements,
      status: 'Pending'
    });

    console.log('Booking saved successfully');

    /* Send response immediately */
    res.status(201).json({
      success: true,
      message: 'Booking successful',
      booking
    });

    /* Send email in background */
    sendUserConfirmation(booking)
      .then(() => {
        console.log('Confirmation email sent');
      })
      .catch((err) => {
        console.error('Email error:', err);
      });

  } catch (err) {
    console.error('Create booking error:', err);

    return res.status(500).json({
      success: false,
      message: err.message || 'Server error'
    });
  }
};

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
    console.error('Availability error:', err);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/* UPDATE BOOKING STATUS */
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

    res.json({
      success: true,
      booking
    });

    sendStatusUpdate(booking)
      .then(() => {
        console.log('Status email sent');
      })
      .catch((err) => {
        console.error('Email error:', err);
      });

  } catch (err) {
    console.error('Update booking status error:', err);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/* LIST BOOKINGS */
export const listBookings = async (req, res) => {
  try {
    const filter = req.query.status
      ? { status: req.query.status }
      : {};

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 });

    const [total, pending, confirmed, rejected] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'Pending' }),
      Booking.countDocuments({ status: 'Confirmed' }),
      Booking.countDocuments({ status: 'Rejected' })
    ]);

    return res.json({
      success: true,
      bookings,
      stats: {
        total,
        pending,
        confirmed,
        rejected
      }
    });

  } catch (err) {
    console.error('List bookings error:', err);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};