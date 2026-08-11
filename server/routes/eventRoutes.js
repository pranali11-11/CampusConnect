const express = require('express');
const router = express.Router();
const {
  getApprovedEvents,
  getUpcomingEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  approveEventByHOD,
  rejectEventByHOD,
  getTeacherEvents,
  getPendingEvents,
  getHODDashboardStats,
} = require('../controllers/eventController');
const { uploadBanner } = require('../config/cloudinary');
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Public route to view approved events
router.get('/', getApprovedEvents);

// Teacher's own events (must be defined BEFORE /:id to prevent route clashes)
router.get('/my', protect, roleMiddleware('teacher'), getTeacherEvents);

// HOD pending events (must be defined BEFORE /:id)
router.get('/pending', protect, roleMiddleware('hod'), getPendingEvents);

// HOD dashboard analytics
router.get('/dashboard', protect, roleMiddleware('hod'), getHODDashboardStats);

// Upcoming events route (public)
router.get('/upcoming', getUpcomingEvents);

// Get single event details (public)
router.get('/:id', getEventById);

// Protected routes (for mutations and approvals)
router.post('/', protect, roleMiddleware('teacher'), uploadBanner.single('banner'), createEvent);
router.put('/:id', protect, roleMiddleware('teacher'), uploadBanner.single('banner'), updateEvent);
router.delete('/:id', protect, roleMiddleware('teacher'), deleteEvent);

// HOD Approval/Rejection routes
router.patch('/:id/approve', protect, roleMiddleware('hod'), approveEventByHOD);
router.patch('/:id/reject', protect, roleMiddleware('hod'), rejectEventByHOD);

module.exports = router;
