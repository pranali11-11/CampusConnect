const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { rateLimit } = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Try again later.' },
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, error: 'Too many registration attempts. Try again later.' },
});

// Public auth routes
router.post('/register', registrationLimiter, registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/forgot-password', loginLimiter, (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Password reset feature coming soon',
  });
});

// Protected user profile routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
