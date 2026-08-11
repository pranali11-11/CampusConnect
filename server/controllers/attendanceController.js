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
  const { registrationId, status, attendanceList } = req.body;

  const processRecord = async (regId, st) => {
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

    let attendance = await Attendance.findOne({ registrationId: regId });
    if (attendance) {
      attendance.status = st;
      attendance.markedBy = req.user.id;
      attendance.markedAt = new Date();
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        registrationId: regId,
        studentId: registration.studentId,
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
        userId: registration.studentId,
        type: 'attendance_marked',
        message: { $regex: event.title, $options: 'i' },
        createdAt: { $gte: new Date(Date.now() - 60000) }, // within last 60s
      });
      if (!existingNotif) {
        await Notification.create({
          userId: registration.studentId,
          message: `Your attendance is marked for "${event.title}"`,
          type: 'attendance_marked',
        });
      }

      // Generate certificate ONLY after event has ended
      // (prevents certificates appearing before the event finishes)
      const eventEnd = event.date ? new Date(`${event.date}T${event.time || '23:59:59'}`) : null;
      const hasEventEnded = eventEnd ? new Date() >= eventEnd : true;

      if (hasEventEnded) {
        let certificate = await Certificate.findOne({ registrationId: regId });
        if (!certificate) {
          certificate = await Certificate.create({
            registrationId: regId,
            studentId: registration.studentId,
            eventId: registration.eventId,
          });

          await Notification.create({
            userId: registration.studentId,
            message: `Congratulations! Your certificate for the event "${event.title}" is ready.`,
            type: 'certificate_ready',
          });
        }
      }
    } else {
      // If marked absent, remove certificate (if any)
      registration.status = 'registered';
      await registration.save();
      await Certificate.findOneAndDelete({ registrationId: regId });
    }


    return attendance;
  };

  // If an attendanceList array is provided, process all entries
  if (Array.isArray(attendanceList) && attendanceList.length) {
    const results = [];
    for (const item of attendanceList) {
      const rec = await processRecord(item.registrationId || item.registration, item.status);
      if (rec) results.push(rec);
    }
    return res.status(200).json({ success: true, count: results.length, data: results });
  }

  // Fallback to single record
  if (registrationId && status) {
    const rec = await processRecord(registrationId, status);
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
    Registration.find({ eventId, status: { $in: ['registered', 'attended'] } })
      .populate('studentId', 'name email rollNumber department mobile')
      .sort({ registeredAt: 1 }),
    Attendance.find({ eventId }).lean(),
  ]);

  // Build a lookup map for attendance status by registrationId
  const attendanceMap = {};
  for (const att of attendanceRecords) {
    attendanceMap[att.registrationId.toString()] = att.status;
  }

  // Merge: for each registration, include merged attendance status
  const mergedList = registrations.map((reg) => {
    const regObj = reg.toObject ? reg.toObject() : reg;
    const student = regObj.studentId || {};
    return {
      registrationId: regObj._id,
      studentId: student._id || regObj.studentId,
      name: student.name || 'Unknown',
      rollNumber: student.rollNumber || '—',
      department: student.department || '—',
      email: student.email || '',
      status: attendanceMap[regObj._id.toString()] || 'not_marked',
    };
  });

  res.status(200).json({
    success: true,
    count: mergedList.length,
    data: mergedList,
  });
};

module.exports = {
  markAttendance,
  getEventAttendance,
};
