const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Notification = require('../models/Notification');

const normalizeValue = (value = '') => String(value).trim().toLowerCase();

/**
 * Register a student for an event
 * POST /api/registrations
 * Access: Private (Student only)
 */
const registerForEvent = async (req, res) => {
  const { eventId, teamMembers = [] } = req.body;

  if (!eventId) {
    res.status(400);
    throw new Error('Please provide an event ID');
  }

  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  const fee = Number(event.registrationFee || 0);

  const registrationType = event.registrationType || 'individual';

  if (!['approved', 'hod_approved'].includes(event.status)) {
    res.status(400);
    throw new Error('Cannot register for this event. It has not been approved.');
  }

  if (event.registrationDeadline) {
    const now = new Date();
    const deadlineDate = new Date(event.registrationDeadline);
    if (!isNaN(deadlineDate.getTime())) {
      const endOfDeadlineDay = new Date(
        deadlineDate.getFullYear(),
        deadlineDate.getMonth(),
        deadlineDate.getDate(),
        23,
        59,
        59,
        999
      );

      if (now.getTime() > endOfDeadlineDay.getTime()) {
        res.status(400);
        throw new Error('Registration deadline has passed for this event');
      }
    }
  }

  if (registrationType === 'team') {
    const safeMembers = Array.isArray(teamMembers) ? teamMembers : [];
    const totalMembers = safeMembers.length + 1;
    const minTeamSize = Number(event.minTeamSize || 2);
    const maxTeamSize = Number(event.maxTeamSize || 4);

    if (totalMembers < minTeamSize || totalMembers > maxTeamSize) {
      res.status(400);
      throw new Error(`Team size must be between ${minTeamSize} and ${maxTeamSize} members.`);
    }

    const duplicateTeamMember = safeMembers.some((member, index) => {
      const memberEmail = normalizeValue(member.email || '');
      const memberName = normalizeValue(member.name || '');

      return safeMembers.some((other, otherIndex) => {
        if (index === otherIndex) return false;

        const otherEmail = normalizeValue(other.email || '');
        const otherName = normalizeValue(other.name || '');

        return (
          (memberEmail && otherEmail && memberEmail === otherEmail) ||
          (memberName && otherName && memberName === otherName)
        );
      });
    });

    if (duplicateTeamMember) {
      res.status(400);
      throw new Error('Each teammate must be unique. Duplicate team member details were provided.');
    }

    for (const member of safeMembers) {
      if (!member.name || !member.email) {
        res.status(400);
        throw new Error('Each team member must include a name and email.');
      }
    }
  } else if (teamMembers && teamMembers.length > 0) {
    res.status(400);
    throw new Error('This event accepts individual registrations only.');
  }

  const normalizedEmails = [req.user.email, ...(Array.isArray(teamMembers) ? teamMembers.map((member) => member.email) : [])]
    .filter(Boolean)
    .map((email) => normalizeValue(email));

  const normalizedNames = [req.user.name, ...(Array.isArray(teamMembers) ? teamMembers.map((member) => member.name) : [])]
    .filter(Boolean)
    .map((name) => normalizeValue(name));

  const existingRegistration = await Registration.findOne({
    eventId,
    status: { $in: ['registered', 'attended'] },
    $or: [
      { studentId: req.user.id },
      { teamLeadId: req.user.id },
      { 'teamMembers.email': { $in: normalizedEmails } },
      { 'teamMembers.name': { $in: normalizedNames } },
      { 'teamMembers.studentId': req.user.id },
    ],
  });

  if (existingRegistration) {
    res.status(400);
    throw new Error('You or a teammate is already registered for this event.');
  }

  const activeRegistrationsCount = await Registration.countDocuments({
    eventId: eventId,
    status: { $in: ['registered', 'attended'] },
  });

  if (activeRegistrationsCount >= event.maxParticipants) {
    res.status(400);
    throw new Error('Event registration limit reached. Slots are full.');
  }

  const registration = new Registration({
    studentId: req.user.id,
    teamLeadId: req.user.id,
    eventId: eventId,
    registrationType,
    teamMembers: Array.isArray(teamMembers)
      ? teamMembers.map((member) => ({
          name: member.name,
          email: member.email,
          studentId: member.studentId || null,
        }))
      : [],
    status: 'registered',
    paymentStatus: fee > 0 ? 'pending' : 'free',
    paymentAmount: fee,
    qrData: 'PENDING_GENERATION',
  });

  registration.qrData = `CC-REG-${registration._id.toString()}-${req.user.id}`;
  await registration.save();

  await Notification.create({
    userId: req.user.id,
    message: fee > 0
      ? `Your registration for "${event.title}" is pending payment of ₹${fee}. Please complete payment confirmation.`
      : `You have successfully registered for the event "${event.title}". Your registration code is ${registration.qrData}.`,
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
 * Update payment status for a registration
 * PATCH /api/registrations/payment-status
 * Access: Private (Teacher / HOD)
 */
const updatePaymentStatus = async (req, res) => {
  const { registrationId, paymentStatus } = req.body;

  if (!registrationId) {
    res.status(400);
    throw new Error('Please provide a registration ID');
  }

  const validStatuses = ['free', 'pending', 'paid'];
  if (!validStatuses.includes(paymentStatus)) {
    res.status(400);
    throw new Error('Invalid payment status');
  }

  const registration = await Registration.findById(registrationId).populate('eventId', 'title createdBy');
  if (!registration) {
    res.status(404);
    throw new Error('Registration not found');
  }

  if (registration.eventId && registration.eventId.createdBy && registration.eventId.createdBy.toString() !== req.user.id && req.user.role !== 'hod') {
    res.status(403);
    throw new Error('Forbidden: You are not authorized to update payment status');
  }

  registration.paymentStatus = paymentStatus;
  if (paymentStatus === 'paid') {
    registration.paymentAmount = Math.max(registration.paymentAmount || 0, 0);
  }
  await registration.save();

  await Notification.create({
    userId: registration.studentId,
    message: `Your payment status for "${registration.eventId?.title || 'the event'}" has been updated to ${paymentStatus}.`,
    type: 'payment_updated',
  });

  res.status(200).json({
    success: true,
    data: registration,
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
  updatePaymentStatus,
  getEventParticipants,
};
