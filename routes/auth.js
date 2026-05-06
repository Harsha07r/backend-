import express from 'express';
import { registerUser, loginUser } from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

router.get('/dashboard', authMiddleware, (req, res) => {
  res.json({ message: `Welcome to the dashboard, user ${req.user}` });
});

export default router;
