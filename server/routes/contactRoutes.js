const express = require('express');
const router = express.Router();
const { submitContactMessage } = require('../controllers/contactController');

// Submit a contact message (public endpoint)
router.post('/', submitContactMessage);

module.exports = router;
