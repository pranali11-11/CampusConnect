/**
 * Analytics controller.
 *
 * This project already has rich aggregated statistics in:
 * - GET /api/events/dashboard (HOD)
 *
 * For STEP 1 compliance, we expose a lightweight summary endpoint under /api/analytics.
 */

const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');

const getAnalyticsSummary = async (req, res) => {
  // Keep this lightweight and fast.
  const [totalEvents, pendingEvents, approvedEvents, totalRegistrations, totalStudents, totalTeachers] = await Promise.all([
    Event.countDocuments(),
    Event.countDocuments({ status: 'pending' }),
    Event.countDocuments({ status: { $in: ['approved', 'hod_approved'] } }),
    Registration.countDocuments(),
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'teacher' }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalEvents,
      pendingEvents,
      approvedEvents,
      totalRegistrations,
      totalStudents,
      totalTeachers,
    },
  });
};

module.exports = {
  getAnalyticsSummary,
};

