import Booking from '../models/Booking.js';
import Tour from '../models/Tour.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { escapeRegex } from '../utils/escape.js';
import {
  sendAdminNotification,
  sendStatusUpdate,
  sendUserConfirmation,
} from '../services/emailService.js';

const dayRange = (date) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return { $gte: start, $lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
};

const NOTIFY_CLIENT = new Set(['Confirmed', 'Rejected', 'Cancelled']);

export const createBooking = async (req, res) => {
  const body = req.body;

  // Honeypot: bots fill the hidden field. Pretend it worked, store nothing.
  if (body.website) return res.status(201).json({ success: true, message: 'Enquiry received' });

  // Prefer the real tour title over whatever the browser sent.
  const tour = await Tour.findOne({ $or: [{ slug: body.tourId }, { legacyId: body.tourId }] })
    .select('title')
    .lean();
  const tourName = tour?.title || body.tourName;
  if (!tourName) throw new AppError(400, 'Unknown tour');

  // Optional cap. Unset (default) means unlimited.
  if (env.DEFAULT_TOUR_CAPACITY) {
    const taken = await Booking.countDocuments({
      tourId: body.tourId,
      travelDate: dayRange(body.travelDate),
      status: { $nin: ['Rejected', 'Cancelled'] },
    });
    if (taken >= env.DEFAULT_TOUR_CAPACITY) {
      throw new AppError(409, 'That date is fully booked. Please choose another date.');
    }
  }

  const booking = await Booking.create({
    tourId: body.tourId,
    tourName,
    userId: req.user?._id ?? null,
    fullName: body.fullName,
    email: body.email,
    phone: body.phone,
    travelDate: body.travelDate,
    numberOfPeople: body.numberOfPeople,
    accommodationType: body.accommodationType,
    otherRequirements: body.otherRequirements,
  });

  res.status(201).json({
    success: true,
    message: 'Enquiry received. Our team will contact you shortly.',
    booking: { id: booking._id, tourName: booking.tourName, travelDate: booking.travelDate },
  });

  // Fire and forget; the email service never throws.
  sendUserConfirmation(booking);
  sendAdminNotification(booking);
};

export const checkAvailability = async (req, res) => {
  const { tourId } = req.params;
  const cap = env.DEFAULT_TOUR_CAPACITY ?? null;

  if (!cap) return res.json({ success: true, capacity: null, isAvailable: true });

  const bookedCount = await Booking.countDocuments({
    tourId,
    travelDate: dayRange(req.valid.query.date),
    status: { $nin: ['Rejected', 'Cancelled'] },
  });
  res.json({ success: true, bookedCount, capacity: cap, isAvailable: bookedCount < cap });
};

export const listBookings = async (req, res) => {
  const { status, q, page, limit } = req.valid.query;

  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ fullName: rx }, { email: rx }, { tourName: rx }, { phone: rx }];
  }

  const [bookings, total, grouped] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter),
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const stats = { total: 0, pending: 0, contacted: 0, confirmed: 0, rejected: 0, cancelled: 0 };
  for (const g of grouped) {
    stats[g._id.toLowerCase()] = g.count;
    stats.total += g.count;
  }

  res.json({
    success: true,
    bookings,
    stats,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
};

export const getBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id).lean();
  if (!booking) throw new AppError(404, 'Enquiry not found');
  res.json({ success: true, booking });
};

export const updateBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError(404, 'Enquiry not found');

  const { status, adminNotes } = req.body;
  const statusChanged = status && status !== booking.status;

  if (status) booking.status = status;
  if (adminNotes !== undefined) booking.adminNotes = adminNotes;
  if (statusChanged && status === 'Contacted') booking.contactedAt = new Date();
  await booking.save();

  res.json({ success: true, booking });

  if (statusChanged && NOTIFY_CLIENT.has(booking.status)) sendStatusUpdate(booking);
};

export const addNote = async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { $push: { notes: { by: req.admin.username, text: req.body.text } } },
    { new: true }
  );
  if (!booking) throw new AppError(404, 'Enquiry not found');
  res.status(201).json({ success: true, booking });
};
