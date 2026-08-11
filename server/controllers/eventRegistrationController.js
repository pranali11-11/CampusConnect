const Registration = require('../models/Registration');

/**
 * Return registrations for an event along with total count.
 * GET /api/events/:eventId/registrations
 */
const getEventRegistrations = async (req, res) => {
  const { eventId } = req.params;

  // Return count of active registrations (registered + attended)
  // so seats remaining works with existing maxParticipants logic.
  const [count, registrations] = await Promise.all([
    Registration.countDocuments({
      eventId,
      status: { $in: ['registered', 'attended'] },
    }),
    Registration.find({
      eventId,
      status: { $in: ['registered', 'attended'] },
    }).populate('studentId', 'name email rollNumber department mobile status'),
  ]);

  res.status(200).json({
    success: true,
    data: {
      count,
      registrations,
    },
  });
};

module.exports = { getEventRegistrations };

