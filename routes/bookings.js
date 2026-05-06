import express from 'express';
import { createBooking, checkAvailability, listBookings, updateBookingStatus } from '../controllers/bookingController.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = express.Router();

router.post('/', createBooking);
router.get('/availability/:tourId', checkAvailability);

// Admin protected routes
router.get('/', adminMiddleware, listBookings);
router.put('/:bookingId/status', adminMiddleware, updateBookingStatus);

export default router;
