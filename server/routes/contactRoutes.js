const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const { submitContactMessage } = require('../controllers/contactController');

const contactLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 5,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	message: { success: false, error: 'Too many messages submitted. Try again later.' },
});

// Submit a contact message (public endpoint)
router.post('/', contactLimiter, submitContactMessage);

module.exports = router;
