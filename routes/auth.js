const express = require('express');
const router = express.Router();

const { registerUser, loginUser } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware'); // ✅ Add this

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// ✅ Protected route
router.get('/dashboard', authMiddleware, (req, res) => {
  res.json({ message: `Welcome to the dashboard, user ${req.user}` });
});

module.exports = router;
