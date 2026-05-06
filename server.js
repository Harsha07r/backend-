import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contact.js';
import bookingsRouter from './routes/bookings.js';
import adminRoutes from './routes/admin.js';
import authMiddleware from './middleware/authMiddleware.js';

dotenv.config();

const app = express();

// ===== MIDDLEWARE =====
app.use(cors({
  origin: [
    "https://www.royalhorizon.in",
    "https://royalhorizon.in",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// ===== ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRoutes);

// Protected route example
app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ 
    message: 'This is a protected route', 
    user: req.user 
  });
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Travel Booking API is running',
    version: '1.0.0'
  });
});

// ===== DB + SERVER =====
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running`);
    console.log('✅ Connected to MongoDB');
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

export default app;
