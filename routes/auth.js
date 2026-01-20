const express = require('express');
const router = express.Router();

const { registerUser, loginUser } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware'); // ✅ Add this

// Public routes
// Calls registerUser to handle user registration (sign up).
router.post('/register', registerUser);
// Calls loginUser to handle user login.
router.post('/login', loginUser);

// Protected route
// Uses authMiddleware to check if the user is authenticated before allowing access.
router.get('/dashboard', authMiddleware, (req, res) => {
  res.json({ message: `Welcome to the dashboard, user ${req.user}` });
});

module.exports = router;
