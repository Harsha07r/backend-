import 'dotenv/config';
import { z } from 'zod';

// Treat empty strings (e.g. `ADMIN_PHONE=`) as "not set".
const raw = Object.fromEntries(
  Object.entries(process.env).filter(([, v]) => v !== '')
);

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),

    // Comma separated list of extra allowed browser origins.
    CLIENT_ORIGINS: z.string().default(''),
    FRONTEND_URL: z.string().optional(),

    // Cookie settings. Use SameSite=none only when the API lives on a different site.
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_DOMAIN: z.string().optional(),

    // Bootstrap super admin (created only if no super admin exists yet).
    ADMIN_EMAIL: z.string().optional(),
    ADMIN_PASSWORD: z.string().optional(),
    ADMIN_EMAIL_PASSWORD: z.string().optional(),

    // Optional hard cap of enquiries per tour per day. Unset = unlimited.
    DEFAULT_TOUR_CAPACITY: z.coerce.number().int().positive().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.NODE_ENV === 'production' && v.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be at least 32 characters in production',
      });
    }
  });

const parsed = schema.safeParse(raw);

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  console.error(`Invalid environment configuration:\n${lines.join('\n')}`);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

const defaults = [
  'https://www.royalhorizon.in',
  'https://royalhorizon.in',
  'http://localhost:5173',
  'http://localhost:3000',
];

export const allowedOrigins = [
  ...new Set(
    [
      ...defaults,
      env.FRONTEND_URL,
      ...env.CLIENT_ORIGINS.split(',').map((s) => s.trim()),
    ].filter(Boolean)
  ),
];
