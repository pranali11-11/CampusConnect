const express = require('express');
const router = express.Router();
const { getMyCertificates, getCertificateById } = require('../controllers/certificateController');
const { protect } = require('../middleware/authMiddleware');

// All certificate routes are private
router.use(protect);

// Student retrieves their own certificates list (defined BEFORE /:id)
router.get('/my', getMyCertificates);

// Retrieve detailed certificate view
router.get('/:id', getCertificateById);

module.exports = router;
