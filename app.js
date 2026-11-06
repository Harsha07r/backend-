import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoose from 'mongoose';

import { allowedOrigins, isProd, isTest } from './config/env.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import bookingRoutes from './routes/bookings.js';
import contactRoutes from './routes/contact.js';
import tourRoutes from './routes/tours.js';

const app = express();

app.disable('x-powered-by');
if (isProd) app.set('trust proxy', 1); // correct client IPs behind Render/Vercel/nginx

app.use(helmet());
app.use(compression());
if (!isTest) app.use(morgan(isProd ? 'combined' : 'dev'));

app.use(
  cors({
    origin(origin, cb) {
      // No Origin header = server-to-server, curl, or same-origin requests.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use('/api', globalLimiter);

app.get('/', (_req, res) => res.json({ name: 'Royal Horizon API', status: 'ok' }));
app.get('/api/health', (_req, res) => {
  const db = mongoose.connection.readyState === 1;
  res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded', db });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/tours', tourRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
