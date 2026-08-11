const express = require('express');
const router = express.Router();
const {
  markAttendance,
  getEventAttendance,
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All attendance routes require authentication
router.use(protect);

// Allow both Teachers and HODs to mark/view event attendance
router.post('/mark', roleMiddleware('teacher', 'hod'), markAttendance);
router.get('/:eventId', roleMiddleware('teacher', 'hod'), getEventAttendance);

module.exports = router;
