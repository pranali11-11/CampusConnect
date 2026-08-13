const Registration = require('../models/Registration');

/**
 * Return registrations for an event along with total count.
 * GET /api/events/:eventId/registrations
 */
const getEventRegistrations = async (req, res) => {
  const { eventId } = req.params;

  // Return count of confirmed registrations (registered + attended with confirmed payment)
  // For paid events, only count those with paymentStatus 'paid'. For free events, count all.
  const event = await Event.findById(eventId);
  const isPaidEvent = event && event.registrationFee > 0;

  const paymentFilter = isPaidEvent ? { paymentStatus: { $in: ['paid', 'free'] } } : {};

  const [count, registrations] = await Promise.all([
    Registration.countDocuments({
      eventId,
      status: { $in: ['registered', 'attended'] },
      ...paymentFilter,
    }),
    Registration.find({
      eventId,
      status: { $in: ['registered', 'attended'] },
      ...paymentFilter,
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

