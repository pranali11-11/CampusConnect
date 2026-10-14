const express = require('express');
const router = express.Router();
const {
  getMyCertificates,
  getCertificateById,
  generateCertificate,
  downloadCertificate,
} = require('../controllers/certificateController');
const { protect } = require('../middleware/authMiddleware');

// All certificate routes are private
router.use(protect);

// Student retrieves their own certificates list (defined BEFORE /:id)
router.get('/my', getMyCertificates);

// Generate certificate for a registration
router.post('/generate', generateCertificate);

// Download certificate PDF
router.get('/:id/download', downloadCertificate);

// Retrieve detailed certificate view
router.get('/:id', getCertificateById);

module.exports = router;
