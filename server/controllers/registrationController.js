const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Notification = require('../models/Notification');

/**
 * Register a student for an event
 * POST /api/registrations
 * Access: Private (Student only)
 */
const registerForEvent = async (req, res) => {
  const { eventId } = req.body;

  if (!eventId) {
    res.status(400);
    throw new Error('Please provide an event ID');
  }

  // Find the event
  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  // Check if event is approved
  if (!['approved', 'hod_approved'].includes(event.status)) {
    res.status(400);
    throw new Error('Cannot register for this event. It has not been approved.');
  }

  // Check if registration deadline has passed
  // Use end of the deadline day (23:59:59.999) so the entire day is valid
  const now = new Date();
  const deadlineDate = new Date(event.registrationDeadline);
  const endOfDeadlineDay = new Date(deadlineDate);
  endOfDeadlineDay.setHours(23, 59, 59, 999);
  
  if (now > endOfDeadlineDay) {
    res.status(400);
    throw new Error('Registration deadline has passed for this event');
  }

  // Check if student is already registered
  const existingRegistration = await Registration.findOne({
    studentId: req.user.id,
    eventId: eventId,
    status: { $in: ['registered', 'attended'] },
  });

  if (existingRegistration) {
    res.status(400);
    throw new Error('You are already registered for this event');
  }

  // Check if maximum capacity is reached
  const activeRegistrationsCount = await Registration.countDocuments({
    eventId: eventId,
    status: { $in: ['registered', 'attended'] },
  });

  if (activeRegistrationsCount >= event.maxParticipants) {
    res.status(400);
    throw new Error('Event registration limit reached. Slots are full.');
  }

  // Initialize registration instance first to get _id
  const registration = new Registration({
    studentId: req.user.id,
    eventId: eventId,
    status: 'registered',
    qrData: 'PENDING_GENERATION', // placeholder to satisfy schema validation if any
  });

  // Assign QR data containing registration details
  registration.qrData = `CC-REG-${registration._id.toString()}-${req.user.id}`;
  await registration.save();

  // Trigger Notification to student
  await Notification.create({
    userId: req.user.id,
    message: `You have successfully registered for the event "${event.title}". Your registration code is ${registration.qrData}.`,
    type: 'registration_confirmed',
  });

  res.status(201).json({
    success: true,
    data: registration,
  });
};

/**
 * Get logged-in student's registrations
 * GET /api/registrations/my
 * Access: Private (Student only)
 */
const getStudentRegistrations = async (req, res) => {
  const registrations = await Registration.find({ studentId: req.user.id })
    .populate({
      path: 'eventId',
      populate: {
        path: 'coordinatorId',
        select: 'name email mobile',
      },
    })
    .sort({ registeredAt: -1 });

  res.status(200).json({
    success: true,
    count: registrations.length,
    data: registrations,
  });
};

/**
 * View event participants list
 * GET /api/registrations/:eventId/list
 * Access: Private (Teacher / HOD)
 */
const getEventParticipants = async (req, res) => {
  const { eventId } = req.params;

  // Find the event
  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  // Check permission: HOD can view all, Teacher can view if they are the event creator
  if (req.user.role !== 'hod' && event.createdBy.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Forbidden: You are not authorized to view participants for this event');
  }

  // Fetch registrations
  const registrations = await Registration.find({ eventId })
    .populate('studentId', 'name email rollNumber department mobile status')
    .sort({ registeredAt: 1 });

  res.status(200).json({
    success: true,
    count: registrations.length,
    data: registrations,
  });
};

module.exports = {
  registerForEvent,
  getStudentRegistrations,
  getEventParticipants,
};
