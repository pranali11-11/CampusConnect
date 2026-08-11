const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public auth routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Password reset feature coming soon',
  });
});

// Protected user profile route
router.get('/me', protect, getMe);

module.exports = router;
