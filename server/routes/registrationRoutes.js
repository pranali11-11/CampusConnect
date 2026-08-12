const express = require('express');
const router = express.Router();
const {
  registerForEvent,
  getStudentRegistrations,
  getEventParticipants,
  updatePaymentStatus,
} = require('../controllers/registrationController');
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All registration routes require authentication
router.use(protect);

// Student registration endpoints
router.post('/', roleMiddleware('student'), registerForEvent);
router.patch('/payment-status', roleMiddleware('teacher', 'hod'), updatePaymentStatus);
router.get('/my', roleMiddleware('student'), getStudentRegistrations);

// Teacher/HOD event rosters view
router.get('/:eventId/list', roleMiddleware('teacher', 'hod'), getEventParticipants);

module.exports = router;
