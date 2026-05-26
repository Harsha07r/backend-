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
import Admin from './models/Admin.js';

dotenv.config();

const app = express();

// MIDDLEWARE
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

//ROUTES 
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRoutes);

app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ 
    message: 'This is a protected route', 
    user: req.user 
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Travel Booking API is running',
    version: '1.0.0'
  });
});

const PORT = process.env.PORT || 5000;

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  console.log('[seed] ADMIN_EMAIL:', email);
  console.log('[seed] ADMIN_PASSWORD set:', !!password);

  if (!email || !password) {
    console.warn('[seed] ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping');
    return;
  }

  try {
    await Admin.deleteMany({ $or: [{ email: email.toLowerCase() }, { username: 'admin' }] });
    const admin = await Admin.create({ username: 'admin', email: email.toLowerCase(), password });
    console.log('[seed] Admin created, id:', admin._id);

    // Verify the password was hashed correctly
    const ok = await admin.comparePassword(password);
    console.log('[seed] Password verify after seed:', ok);
  } catch (err) {
    console.error('[seed] Error seeding admin:', err.message);
  }
}

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  await seedAdmin();
  app.listen(PORT, () => {
    console.log(`Server running`);
    console.log('Connected to MongoDB');
  });
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
});

export default app;
