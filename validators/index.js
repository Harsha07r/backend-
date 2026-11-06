import { z } from 'zod';
import { ROLES } from '../config/rbac.js';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParams = z.object({ id: objectId });

const email = z.email('Invalid email').trim().toLowerCase().max(254);
const phone = z.string().trim().max(20).optional();

export const strongPassword = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128)
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/\d/, 'Password needs a number');

/* ---------- customers ---------- */
export const registerUser = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(80),
  email,
  password: strongPassword,
});

export const login = z.object({
  email,
  password: z.string().min(1).max(128),
});

/* ---------- admin / staff ---------- */
export const createStaff = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9._-]+$/, 'Use letters, numbers, dot, dash or underscore'),
  email,
  password: strongPassword,
  role: z.enum(ROLES).default('support'),
});

export const updateStaff = z
  .object({
    role: z.enum(ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const changePassword = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: strongPassword,
});

/* ---------- enquiries (bookings) ---------- */
export const BOOKING_STATUSES = ['Pending', 'Contacted', 'Confirmed', 'Rejected', 'Cancelled'];

const startOfTodayUtc = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

export const createBooking = z.object({
  tourId: z.string().trim().min(1).max(100),
  tourName: z.string().trim().max(200).optional(),
  fullName: z.string().trim().min(2, 'Name is too short').max(100),
  email,
  phone,
  travelDate: z.coerce
    .date({ error: 'Invalid travel date' })
    .refine((d) => d >= startOfTodayUtc(), 'Travel date cannot be in the past'),
  numberOfPeople: z.coerce.number().int().min(1).max(50).default(1),
  accommodationType: z.string().trim().max(50).default('Standard'),
  otherRequirements: z.string().trim().max(1000).optional(),
  website: z.string().optional(), // honeypot, must stay empty
});

export const availabilityQuery = z.object({
  date: z.coerce.date({ error: 'Invalid date' }),
});

export const listBookingsQuery = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const updateBooking = z
  .object({
    status: z.enum(BOOKING_STATUSES).optional(),
    adminNotes: z.string().trim().max(2000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const addNote = z.object({ text: z.string().trim().min(1).max(1000) });

/* ---------- contact messages ---------- */
export const CONTACT_STATUSES = ['New', 'Read', 'Replied'];

export const createContact = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  phone,
  message: z.string().trim().min(5, 'Message is too short').max(2000),
  website: z.string().optional(),
});

export const listContactsQuery = z.object({
  status: z.enum(CONTACT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const updateContact = z.object({ status: z.enum(CONTACT_STATUSES) });

/* ---------- tours ---------- */
export const TOUR_CATEGORIES = [
  'Pilgrimage',
  'Honeymoon',
  'Adventure',
  'Leisure',
  'Family',
  'Wildlife',
  'Cultural',
];

const image = z.object({ url: z.string().trim().min(1).max(500), alt: z.string().trim().max(200).default('') });

const tourBase = z.object({
  title: z.string().trim().min(3).max(150),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by dashes')
    .max(120)
    .optional(),
  legacyId: z.string().trim().max(100).optional(),
  destination: z.string().trim().min(2).max(100),
  category: z.enum(TOUR_CATEGORIES),
  durationDays: z.coerce.number().int().min(1).max(60),
  summary: z.string().trim().min(10).max(300),
  description: z.string().trim().max(10000).default(''),
  highlights: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  itinerary: z
    .array(
      z.object({
        day: z.coerce.number().int().min(1).max(60),
        title: z.string().trim().min(1).max(150),
        description: z.string().trim().max(2000).default(''),
      })
    )
    .max(60)
    .default([]),
  inclusions: z.array(z.string().trim().min(1).max(200)).max(40).default([]),
  exclusions: z.array(z.string().trim().min(1).max(200)).max(40).default([]),
  heroImage: image.optional(),
  gallery: z.array(image).max(40).default([]),
  faqs: z
    .array(z.object({ question: z.string().trim().min(1).max(300), answer: z.string().trim().min(1).max(2000) }))
    .max(30)
    .default([]),
  seo: z
    .object({
      title: z.string().trim().max(70).optional(),
      description: z.string().trim().max(170).optional(),
      ogImage: z.string().trim().max(500).optional(),
    })
    .default({}),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});

export const createTour = tourBase;
export const updateTour = tourBase.partial().refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const listToursQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(TOUR_CATEGORIES).optional(),
  destination: z.string().trim().max(100).optional(),
  featured: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const slugParams = z.object({
  slug: z.string().trim().toLowerCase().min(1).max(120),
});
