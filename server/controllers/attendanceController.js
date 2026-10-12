const Attendance = require('../models/Attendance');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Certificate = require('../models/Certificate');
const Notification = require('../models/Notification');

/**
 * Mark student attendance for an event
 * POST /api/attendance/mark
 * Access: Private (Teacher / HOD)
 */
const markAttendance = async (req, res) => {
  // Support both single mark and bulk list
  const { registrationId, studentId, status, attendanceList } = req.body;

  const processRecord = async (regId, participantId, st) => {
    if (!regId || !st) return null;
    if (!['present', 'absent'].includes(st)) return null;

    const registration = await Registration.findById(regId);
    if (!registration) return null;

    const event = await Event.findById(registration.eventId);
    if (!event) return null;

    // Authorization check (HOD or creator or coordinator)
    const isCreator = event.createdBy.toString() === req.user.id;
    const isCoordinator = event.coordinatorId && event.coordinatorId.toString() === req.user.id;
    const isHOD = req.user.role === 'hod';
    if (!isHOD && !isCreator && !isCoordinator) return null;

    participantId = participantId || registration.studentId;
    let attendance = await Attendance.findOne({ registrationId: regId, studentId: participantId });
    if (attendance) {
      attendance.status = st;
      attendance.markedBy = req.user.id;
      attendance.markedAt = new Date();
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        registrationId: regId,
        studentId: participantId,
        eventId: registration.eventId,
        status: st,
        markedBy: req.user.id,
      });
    }

    // Update registration status and handle certificates
    if (st === 'present') {
      // Mark registration as attended
      registration.status = 'attended';
      await registration.save();

      // Send attendance notification to student
      const existingNotif = await Notification.findOne({
        userId: participantId,
        type: 'attendance_marked',
        message: { $regex: event.title, $options: 'i' },
        createdAt: { $gte: new Date(Date.now() - 60000) }, // within last 60s
      });
      if (!existingNotif) {
        await Notification.create({
          userId: participantId,
          message: `Your attendance is marked for "${event.title}"`,
          type: 'attendance_marked',
        });
      }

      // Generate certificate ONLY after event has ended
      // (prevents certificates appearing before the event finishes)
      const eventEnd = event.date ? new Date(`${event.date}T${event.time || '23:59:59'}`) : null;
      const hasEventEnded = eventEnd ? new Date() >= eventEnd : true;

      if (hasEventEnded) {
        let certificate = await Certificate.findOne({ registrationId: regId, studentId: participantId });
        if (!certificate) {
          certificate = await Certificate.create({
            registrationId: regId,
            studentId: participantId,
            eventId: registration.eventId,
          });

          await Notification.create({
            userId: participantId,
            message: `Congratulations! Your certificate for the event "${event.title}" is ready.`,
            type: 'certificate_ready',
          });
        }
      }
    } else {
      // If marked absent, remove certificate (if any)
      registration.status = 'registered';
      await registration.save();
      await Certificate.findOneAndDelete({ registrationId: regId, studentId: participantId });
    }


    return attendance;
  };

  // If an attendanceList array is provided, process all entries
  if (Array.isArray(attendanceList) && attendanceList.length) {
    const results = [];
    for (const item of attendanceList) {
      const rec = await processRecord(item.registrationId || item.registration, item.studentId, item.status);
      if (rec) results.push(rec);
    }
    return res.status(200).json({ success: true, count: results.length, data: results });
  }

  // Fallback to single record
  if (registrationId && status) {
    const rec = await processRecord(registrationId, studentId, status);
    if (!rec) {
      res.status(400);
      throw new Error('Could not process attendance for the provided record');
    }
    return res.status(200).json({ success: true, data: rec });
  }

  res.status(400);
  throw new Error('Please provide either registrationId+status or attendanceList');
};

/**
 * Get merged attendance list for a specific event
 * Fetches all registrations + existing attendance records and merges them
 * GET /api/attendance/:eventId
 * Access: Private (Teacher / HOD)
 */
const getEventAttendance = async (req, res) => {
  const { eventId } = req.params;

  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  // Verify permission: HOD or Event Creator / Coordinator
  const isCreator = event.createdBy.toString() === req.user.id;
  const isCoordinator = event.coordinatorId && event.coordinatorId.toString() === req.user.id;
  const isHOD = req.user.role === 'hod';

  if (!isHOD && !isCreator && !isCoordinator) {
    res.status(403);
    throw new Error('Forbidden: You are not authorized to view attendance for this event');
  }

  // Fetch all registrations + existing attendance records in parallel
  const [registrations, attendanceRecords] = await Promise.all([
    Registration.find({ eventId, status: { $nin: ['rejected', 'cancelled'] } })
      .populate('studentId', 'name email rollNumber department mobile')
      .populate('teamMembers.studentId', 'name email rollNumber department mobile')
      .sort({ registeredAt: 1 }),
    Attendance.find({ eventId }).lean(),
  ]);

  // Team registrations have one attendance row per participant.
  const attendanceMap = {};
  for (const att of attendanceRecords) {
    attendanceMap[`${att.registrationId}:${att.studentId}`] = att.status;
  }

  // Merge: for each registration, include merged attendance status
  const mergedList = registrations.map((reg) => {
    const regObj = reg.toObject ? reg.toObject() : reg;
    const members = [{ student: regObj.studentId }, ...(regObj.teamMembers || [])
      .filter((member) => member.studentId)
      .map((member) => ({ student: member.studentId, name: member.name, email: member.email }))];

    return members.map((member) => {
      const student = member.student || {};
      const studentId = student._id || student;
      return {
        registrationId: regObj._id,
        studentId,
        participantKey: `${regObj._id}:${studentId}`,
        name: student.name || member.name || 'Unknown',
        rollNumber: student.rollNumber || '—',
        department: student.department || '—',
        email: student.email || member.email || '',
        registrationStatus: regObj.status,
        paymentStatus: regObj.paymentStatus,
        paymentAmount: regObj.paymentAmount,
        transactionId: regObj.transactionId,
        paymentScreenshot: regObj.paymentScreenshot,
        status: attendanceMap[`${regObj._id}:${studentId}`] || 'not_marked',
      };
    });
  });

  res.status(200).json({
    success: true,
    count: mergedList.flat().length,
    data: mergedList.flat(),
  });
};

module.exports = {
  markAttendance,
  getEventAttendance,
};
