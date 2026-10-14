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
  getDepartmentWiseEvents,
  getHODDashboardStats,
} = require('../controllers/eventController');
const { uploadBanner, normalizeFilePath } = require('../config/cloudinary');
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Create multer instance that can handle multiple fields
const uploadFields = uploadBanner.fields([
  { name: 'registrationBanner', maxCount: 1 },
  { name: 'certificateTemplate', maxCount: 1 }
]);

// Public route to view approved events
router.get('/', getApprovedEvents);

// Teacher's own events (must be defined BEFORE /:id to prevent route clashes)
router.get('/my', protect, roleMiddleware('teacher'), getTeacherEvents);

// HOD pending events (must be defined BEFORE /:id)
router.get('/pending', protect, roleMiddleware('hod'), getPendingEvents);

// HOD dashboard analytics
router.get('/dashboard', protect, roleMiddleware('hod'), getHODDashboardStats);

// Department-wise events breakdown (must be defined BEFORE /:id)
router.get('/department-wise', getDepartmentWiseEvents);

// Upcoming events route (public)
router.get('/upcoming', getUpcomingEvents);

// Get single event details (public)
router.get('/:id', getEventById);

// Protected routes (for mutations and approvals)
router.post('/', protect, roleMiddleware('teacher'), uploadFields, normalizeFilePath, createEvent);
router.put('/:id', protect, roleMiddleware('teacher'), uploadFields, normalizeFilePath, updateEvent);
router.delete('/:id', protect, roleMiddleware('teacher'), deleteEvent);

// HOD Approval/Rejection routes
router.patch('/:id/approve', protect, roleMiddleware('hod'), approveEventByHOD);
router.patch('/:id/reject', protect, roleMiddleware('hod'), rejectEventByHOD);

module.exports = router;
