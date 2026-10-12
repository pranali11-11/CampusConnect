const express = require('express');
const router = express.Router();
const {
  registerForEvent,
  getStudentRegistrations,
  getEventParticipants,
  updatePaymentStatus,
  approveRegistration,
  rejectRegistration,
} = require('../controllers/registrationController');
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { uploadBanner, normalizeFilePath } = require('../config/cloudinary');

// All registration routes require authentication
router.use(protect);

// Student registration endpoints
router.post('/', roleMiddleware('student'), uploadBanner.single('paymentScreenshot'), normalizeFilePath, registerForEvent);
router.patch('/payment-status', roleMiddleware('teacher', 'hod'), updatePaymentStatus);
router.get('/my', roleMiddleware('student'), getStudentRegistrations);

// Teacher/HOD event rosters view
router.get('/:eventId/list', roleMiddleware('teacher', 'hod'), getEventParticipants);

// Registration approval/rejection
router.patch('/:registrationId/approve', roleMiddleware('teacher', 'hod'), approveRegistration);
router.patch('/:registrationId/reject', roleMiddleware('teacher', 'hod'), rejectRegistration);

module.exports = router;
