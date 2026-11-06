import { Router } from 'express';
import * as c from '../controllers/bookingController.js';
import { authenticateAdmin, optionalUser, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { formLimiter } from '../middleware/rateLimit.js';
import { PERMISSIONS as P } from '../config/rbac.js';
import * as v from '../validators/index.js';

const router = Router();

// Public
router.post('/', formLimiter, optionalUser, validate({ body: v.createBooking }), c.createBooking);
router.get('/availability/:tourId', validate({ query: v.availabilityQuery }), c.checkAvailability);

// Staff
router.use(authenticateAdmin);
router.get('/', requirePermission(P.BOOKINGS_READ), validate({ query: v.listBookingsQuery }), c.listBookings);
router.get('/:id', requirePermission(P.BOOKINGS_READ), validate({ params: v.idParams }), c.getBooking);
router.patch(
  '/:id',
  requirePermission(P.BOOKINGS_UPDATE),
  validate({ params: v.idParams, body: v.updateBooking }),
  c.updateBooking
);
// Kept for the existing dashboard: PUT /:id/status { status }
router.put(
  '/:id/status',
  requirePermission(P.BOOKINGS_UPDATE),
  validate({ params: v.idParams, body: v.updateBooking }),
  c.updateBooking
);
router.post(
  '/:id/notes',
  requirePermission(P.BOOKINGS_UPDATE),
  validate({ params: v.idParams, body: v.addNote }),
  c.addNote
);

export default router;
