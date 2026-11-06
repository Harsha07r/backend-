import { rateLimit } from 'express-rate-limit';
import { isTest } from '../config/env.js';

const make = (windowMinutes, limit, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => isTest,
    message: { success: false, message },
  });

export const globalLimiter = make(15, 300, 'Too many requests, please slow down.');
export const loginLimiter = make(15, 10, 'Too many login attempts. Try again in 15 minutes.');
export const formLimiter = make(60, 20, 'Too many submissions. Please try again later.');
