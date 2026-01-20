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
    console.log('Incoming booking request:', req.body); // Log the incoming request payload

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

    if (!tourId || !tourName || !fullName || !email || !travelDate) {
      console.error('Missing required fields:', { tourId, tourName, fullName, email, travelDate });
      return res.status(400).json({
        success: false,
        message: 'Required booking information missing'
      });
    }

    const day = normalizeDate(travelDate);
    if (!day) {
      console.error('Invalid travel date:', travelDate);
      return res.status(400).json({
        success: false,
        message: 'Invalid travel date'
      });
    }

    if (numberOfPeople < 1) {
      console.error('Invalid number of people:', numberOfPeople);
      return res.status(400).json({
        success: false,
        message: 'Number of people must be at least 1'
      });
    }

    const capacity = process.env.DEFAULT_TOUR_CAPACITY
      ? parseInt(process.env.DEFAULT_TOUR_CAPACITY, 10)
      : 3;

    console.log('Checking existing bookings for tourId:', tourId, 'on date:', day);
    const existingBookings = await Booking.countDocuments({
      tourId,
      travelDate: day
    });

    if (existingBookings >= capacity) {
      console.error('Tour fully booked for date:', day);
      return res.status(409).json({
        success: false,
        message: `Tour fully booked for ${day}`
      });
    }

    console.log('Creating booking with data:', {
      tourId,
      tourName,
      fullName,
      email,
      phone,
      travelDate: day,
      numberOfPeople,
      accommodationType,
      otherRequirements
    });

    const booking = await Booking.create({
      tourId,
      tourName,
      userId: req.user ? req.user.userId : null,
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

    console.log('Booking created successfully:', booking);
    return res.status(201).json({ success: true, booking });

  } catch (err) {
    console.error('Create booking error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* CHECK AVAILABILITY */
async function checkAvailability(req, res) {
  try {
    console.log('Incoming availability request:', req.params, req.query); // Log the incoming request

    const { tourId } = req.params;
    const { date, capacity } = req.query;

    const day = normalizeDate(date);
    if (!tourId || !day) {
      console.error('Missing or invalid parameters:', { tourId, date });
      return res.status(400).json({
        success: false,
        message: 'tourId and date required'
      });
    }

    console.log('Decoded tourId:', tourId);
    console.log('Normalized date:', day);

    console.log('Checking availability for tourId:', tourId, 'on date:', day);
    const bookedCount = await Booking.countDocuments({
      tourId,
      travelDate: day
    });

    console.log('Database query result:', { bookedCount });

    const cap = capacity
      ? parseInt(capacity, 10)
      : (process.env.DEFAULT_TOUR_CAPACITY
        ? parseInt(process.env.DEFAULT_TOUR_CAPACITY, 10)
        : 3);

    console.log('Final capacity:', cap);

    console.log('Availability check result:', {
      bookedCount,
      capacity: cap,
      isAvailable: bookedCount < cap
    });

    return res.json({
      success: true,
      bookedCount,
      capacity: cap,
      isAvailable: bookedCount < cap
    });

  } catch (err) {
    console.error('Availability error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* LIST BOOKINGS (ADMIN) */
async function listBookings(req, res) {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });

    const stats = {
      total: await Booking.countDocuments(),
      pending: await Booking.countDocuments({ status: 'Pending' }),
      confirmed: await Booking.countDocuments({ status: 'Confirmed' }),
      rejected: await Booking.countDocuments({ status: 'Rejected' }),
      cancelled: await Booking.countDocuments({ status: 'Cancelled' })
    };

    return res.json({ success: true, bookings, stats });
  } catch (err) {
    console.error('List bookings error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* UPDATE STATUS (ADMIN) */
async function updateBookingStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Confirmed', 'Rejected', 'Cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      id,
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
      console.error('Status email error:', e);
    }

    return res.json({ success: true, booking });

  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  createBooking,
  checkAvailability,
  listBookings,
  updateBookingStatus
};
