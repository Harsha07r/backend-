const express = require('express');
const router = express.Router();

const {
  createBooking,
  checkAvailability,
  listBookings,
  updateBookingStatus
} = require('../controllers/bookingController');

const adminMiddleware = require('../middleware/adminMiddleware');

/* =========================
   PUBLIC ROUTES
========================= */

// Create booking (guest or logged-in)
router.post('/', createBooking);
router.post('/create', createBooking);

// Check availability
// GET /api/bookings/availability/:tourId?date=YYYY-MM-DD
router.get('/availability/:tourId', checkAvailability);

/* =========================
   ADMIN ROUTES (PROTECTED)
========================= */

// Get all bookings
router.get('/', adminMiddleware, listBookings);

// Update booking status
router.put('/:id/status', adminMiddleware, updateBookingStatus);

module.exports = router;
