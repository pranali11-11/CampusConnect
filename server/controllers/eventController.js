const fs = require('fs');
const path = require('path');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Attendance = require('../models/Attendance');
const Certificate = require('../models/Certificate');
const Gallery = require('../models/Gallery');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { cloudinary, isCloudinaryConfigured, uploadToCloudinary } = require('../config/cloudinary');

const deleteLocalFileIfExists = (relativeOrAbsoluteUrl) => {
  if (!relativeOrAbsoluteUrl) return Promise.resolve();

  const isCloudinaryUrl = relativeOrAbsoluteUrl.startsWith('http://') || relativeOrAbsoluteUrl.startsWith('https://');
  if (isCloudinaryUrl && isCloudinaryConfigured()) {
    try {
      const match = relativeOrAbsoluteUrl.match(/(?:upload\/.*?\/)?(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/i);
      const publicId = match && match[1] ? match[1].replace(/\//g, ':') : null;
      if (publicId) {
        return cloudinary.uploader.destroy(publicId).catch(() => {});
      }
    } catch (error) {
      console.error('Cloudinary cleanup failed:', error.message);
    }
    return Promise.resolve();
  }

  if (!relativeOrAbsoluteUrl.startsWith('/uploads/') && !relativeOrAbsoluteUrl.startsWith('uploads/')) {
    return Promise.resolve();
  }

  const normalizedPath = relativeOrAbsoluteUrl.replace(/^\/+/, '');
  const localFilePath = path.join(__dirname, '..', normalizedPath);

  return new Promise((resolve) => {
    fs.unlink(localFilePath, (error) => {
      if (error && error.code !== 'ENOENT') {
        console.error('Local image cleanup failed:', error.message);
      }
      resolve();
    });
  });
};

/**
 * Get all approved events (public)
 * GET /api/events
 */
const getApprovedEvents = async (req, res) => {
  const filter = {
    status: { $in: ['approved', 'hod_approved'] },
  };

  if (req.query.status === 'approved') {
    filter.status = { $in: ['approved', 'hod_approved'] };
  }

  if (req.query.department && req.query.department !== 'all') {
    filter.department = req.query.department;
  }

  const events = await Event.find(filter)
    .sort({ date: 1, createdAt: -1 })
    .populate('createdBy coordinatorId', 'name email mobile department');

  res.status(200).json({
    success: true,
    count: events.length,
    data: events,
  });
};

/**
 * Get upcoming approved events.
 * GET /api/events/upcoming
 */
const getUpcomingEvents = async (req, res) => {
  const limit = req.query.limit ? Math.max(1, parseInt(req.query.limit, 10)) : null;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const filter = {
    status: { $in: ['approved', 'hod_approved'] },
    date: { $gte: today },
  };

  if (req.query.department && req.query.department !== 'all') {
    filter.department = req.query.department;
  }

  let query = Event.find(filter)
    .sort({ date: 1 })
    .populate('createdBy coordinatorId', 'name email mobile department');

  if (limit) {
    query = query.limit(limit);
  }

  const events = await query;

  res.status(200).json({
    success: true,
    count: events.length,
    data: events,
  });
};

/**
 * Create a new event
 * POST /api/events
 * Access: Private (Teacher only)
 */
const createEvent = async (req, res) => {
  const {
    title,
    category,
    department: inputDepartment,
    description,
    venue,
    date,
    time,
    maxParticipants,
    registrationDeadline,
    registrationFee,
    registrationBannerUrl,
    bannerUrl,
    coordinatorId,
    registrationType,
    minTeamSize,
    maxTeamSize,
  } = req.body;

  const department = (inputDepartment || req.user.department || '').trim();

  // Verify inputs are not empty
  if (!title || !category || !description || !venue || !date || !time || !maxParticipants || !registrationDeadline || !department) {
    res.status(400);
    throw new Error('Please fill in all required event details including department');
  }

  // Set registrationBannerUrl using uploaded files or the provided fallback URL
  const finalBannerUrl = req.files?.registrationBanner?.[0]?.path || (registrationBannerUrl || bannerUrl || "");
  const finalCertificateTemplate = req.files?.certificateTemplate?.[0]?.path || (req.body.certificateTemplate || "");

  const normalizedRegistrationType = registrationType === 'team' ? 'team' : 'individual';
  const normalizedMinTeamSize = normalizedRegistrationType === 'team' ? Number(minTeamSize || 2) : 1;
  const normalizedMaxTeamSize = normalizedRegistrationType === 'team' ? Number(maxTeamSize || 4) : 1;
  const normalizedRegistrationFee = Number(registrationFee || 0);

  const event = await Event.create({
    title,
    category,
    department,
    description,
    venue,
    date,
    time,
    maxParticipants,
    registrationDeadline,
    registrationFee: normalizedRegistrationFee,
    paymentNumber: req.body.paymentNumber || '',
    whatsappGroupLink: req.body.whatsappGroupLink || '',
    certificateTemplate: finalCertificateTemplate,
    registrationBannerUrl: finalBannerUrl,
    bannerUrl: finalBannerUrl,
    registrationType: normalizedRegistrationType,
    minTeamSize: normalizedMinTeamSize,
    maxTeamSize: normalizedMaxTeamSize,
    coordinatorId: coordinatorId || req.user.id, // Fallback to creator if coordinator not specified
    createdBy: req.user.id,
    status: 'pending', // Fresh events start as pending HOD approval
  });

  res.status(201).json({
    success: true,
    data: event,
  });

  // Notify ONLY the HOD(s) of the department to which the event belongs
  try {
    const hods = await User.find({ role: 'hod', department });
    const notifications = hods.map((hod) => ({
      userId: hod._id,
      message: `New event "${event.title}" from ${department} department requires your review and approval.`,
      type: 'event_reminder',
    }));
    if (notifications.length) await Notification.insertMany(notifications);
  } catch (err) {
    console.error(`Failed to notify HODs of ${department}:`, err.message);
  }
};

/**
 * Get single event by ID
 * GET /api/events/:id
 */
const getEventById = async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('createdBy', 'name email department mobile')
    .populate('approvedByHOD', 'name email department')
    .populate('coordinatorId', 'name email mobile department');

  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  res.status(200).json({
    success: true,
    data: event,
  });
};

/**
 * Edit event details
 * PUT /api/events/:id
 * Access: Private (Teacher owner only)
 */
const updateEvent = async (req, res) => {
  let event = await Event.findById(req.params.id);

  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  // Ensure logged-in teacher is the owner of the event
  if (event.createdBy.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Forbidden: You can only edit events you created');
  }

  // Don't reset status to pending on update - only new events need HOD approval
  // Keep existing status (approved, rejected, or pending)

  // Handle optional registration banner upload
  if (req.files?.registrationBanner?.[0]?.path) {
    req.body.registrationBannerUrl = req.files.registrationBanner[0].path;
    req.body.bannerUrl = req.files.registrationBanner[0].path;
  }

  // Handle optional certificate template upload
  if (req.files?.certificateTemplate?.[0]?.path) {
    req.body.certificateTemplate = req.files.certificateTemplate[0].path;
  }

  // Ensure legacy and new banner fields are synchronized
  if (req.body.registrationBannerUrl && !req.body.bannerUrl) {
    req.body.bannerUrl = req.body.registrationBannerUrl;
  }
  if (req.body.bannerUrl && !req.body.registrationBannerUrl) {
    req.body.registrationBannerUrl = req.body.bannerUrl;
  }

  const registrationType = req.body.registrationType === 'team' ? 'team' : 'individual';
  req.body.registrationType = registrationType;
  req.body.registrationFee = Number(req.body.registrationFee || 0);
  req.body.paymentNumber = req.body.paymentNumber || '';
  req.body.whatsappGroupLink = req.body.whatsappGroupLink || '';
  if (registrationType === 'team') {
    req.body.minTeamSize = Number(req.body.minTeamSize || 2);
    req.body.maxTeamSize = Number(req.body.maxTeamSize || 4);
  } else {
    req.body.minTeamSize = 1;
    req.body.maxTeamSize = 1;
  }

  event = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: event,
  });
};

/**
 * Delete an event
 * DELETE /api/events/:id
 * Access: Private (Teacher owner only)
 */
const deleteEvent = async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  if (event.createdBy.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Forbidden: You can only delete events you created');
  }

  const imageUrls = [event.registrationBannerUrl, event.bannerUrl].filter(Boolean);
  const galleryItems = await Gallery.find({ eventId: event._id });

  for (const item of galleryItems) {
    imageUrls.push(item.imageUrl);
  }

  await Promise.all(imageUrls.map((url) => deleteLocalFileIfExists(url)));

  await Promise.all([
    Registration.deleteMany({ eventId: event._id }),
    Attendance.deleteMany({ eventId: event._id }),
    Certificate.deleteMany({ eventId: event._id }),
    Gallery.deleteMany({ eventId: event._id }),
  ]);

  await event.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Event and all related records were deleted successfully',
  });
};

/**
 * HOD Approves an event
 * PATCH /api/events/:id/approve
 * Access: Private (HOD only)
 */
const approveEventByHOD = async (req, res) => {
  const event = await Event.findById(req.params.id).populate('createdBy', 'name email department');

  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  const eventDept = event.department || event.createdBy?.department;
  if (req.user.role === 'hod' && eventDept && eventDept !== req.user.department) {
    res.status(403);
    throw new Error(`Forbidden: You can only approve events from your own department (${req.user.department})`);
  }

  event.status = 'hod_approved'; // HOD approval should move event into hod_approved bucket
  event.approvedByHOD = req.user.id;
  event.rejectionReason = ''; // Clear rejection reason if previously set

  await event.save();

  // Trigger Notification to event creator (Teacher)
  await Notification.create({
    userId: event.createdBy?._id || event.createdBy,
    message: `Your event "${event.title}" has been approved by HOD ${req.user.name}.`,
    type: 'event_approved',
  });

  res.status(200).json({
    success: true,
    message: 'Event has been successfully approved',
    data: event,
  });
};

/**
 * HOD Rejects an event
 * PATCH /api/events/:id/reject
 * Access: Private (HOD only)
 */
const rejectEventByHOD = async (req, res) => {
  const { rejectionReason } = req.body;

  if (!rejectionReason) {
    res.status(400);
    throw new Error('Please provide a rejection reason');
  }

  const event = await Event.findById(req.params.id).populate('createdBy', 'name email department');

  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  const eventDept = event.department || event.createdBy?.department;
  if (req.user.role === 'hod' && eventDept && eventDept !== req.user.department) {
    res.status(403);
    throw new Error(`Forbidden: You can only reject events from your own department (${req.user.department})`);
  }

  event.status = 'rejected';
  event.rejectionReason = rejectionReason;
  event.approvedByHOD = undefined; // Reset approval in case of revision

  await event.save();

  // Trigger Notification to event creator (Teacher)
  await Notification.create({
    userId: event.createdBy?._id || event.createdBy,
    message: `Your event "${event.title}" has been rejected. Reason: ${rejectionReason}`,
    type: 'event_approved', // Using event_approved type as system message category for HOD decisions
  });

  res.status(200).json({
    success: true,
    message: 'Event has been rejected',
    data: event,
  });
};

/**
 * Get teacher's own events
 * GET /api/events/my
 * Access: Private (Teacher only)
 */
const getTeacherEvents = async (req, res) => {
  const events = await Event.find({ createdBy: req.user.id })
    .populate('coordinatorId', 'name email mobile')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: events.length,
    data: events,
  });
};

/**
 * Get events pending HOD approval
 * GET /api/events/pending
 * Access: Private (HOD only)
 */
const getPendingEvents = async (req, res) => {
  const hodDept = req.user.department;

  const query = { status: 'pending' };
  if (hodDept) {
    query.$or = [
      { department: hodDept },
      { department: { $in: [null, ''] } },
      { department: { $exists: false } },
    ];
  }

  const events = await Event.find(query)
    .populate('createdBy', 'name email department mobile')
    .populate('coordinatorId', 'name email mobile department')
    .sort({ createdAt: -1 });

  // Ensure strict department match for HOD
  const filteredEvents = hodDept
    ? events.filter((ev) => {
        if (ev.department) return ev.department === hodDept;
        return ev.createdBy?.department === hodDept;
      })
    : events;

  res.status(200).json({
    success: true,
    count: filteredEvents.length,
    data: filteredEvents,
  });
};

const COLLEGE_DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Biotechnology',
  'Mathematics',
  'Physics',
  'Chemistry',
];

/**
 * Get all departments and their respective events
 * GET /api/events/department-wise
 */
const getDepartmentWiseEvents = async (req, res) => {
  const filter = {};

  if (req.query.status && req.query.status !== 'all') {
    if (req.query.status === 'approved') {
      filter.status = { $in: ['approved', 'hod_approved'] };
    } else {
      filter.status = req.query.status;
    }
  } else if (!req.user || req.user.role === 'student') {
    filter.status = { $in: ['approved', 'hod_approved'] };
  }

  if (req.query.department && req.query.department !== 'all') {
    filter.department = req.query.department;
  }

  const events = await Event.find(filter)
    .populate('createdBy', 'name email department mobile')
    .populate('coordinatorId', 'name email mobile department')
    .sort({ date: 1, createdAt: -1 });

  const departmentMap = {};
  COLLEGE_DEPARTMENTS.forEach((dept) => {
    departmentMap[dept] = [];
  });

  events.forEach((event) => {
    const dept = event.department || event.createdBy?.department || 'Computer Science';
    if (!departmentMap[dept]) {
      departmentMap[dept] = [];
    }
    departmentMap[dept].push(event);
  });

  const departmentData = Object.keys(departmentMap).map((dept) => {
    const deptEvents = departmentMap[dept];
    const approvedCount = deptEvents.filter((e) => ['approved', 'hod_approved'].includes(e.status)).length;
    const pendingCount = deptEvents.filter((e) => e.status === 'pending').length;
    const rejectedCount = deptEvents.filter((e) => e.status === 'rejected').length;

    return {
      department: dept,
      totalCount: deptEvents.length,
      approvedCount,
      pendingCount,
      rejectedCount,
      events: deptEvents,
    };
  });

  res.status(200).json({
    success: true,
    totalEvents: events.length,
    departmentsCount: departmentData.length,
    data: departmentData,
  });
};

/**
 * Get aggregated HOD dashboard statistics
 * GET /api/events/dashboard
 * Access: Private (HOD only)
 */
const getHODDashboardStats = async (req, res) => {
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 5);

  const [
    totalEvents,
    pendingEvents,
    approvedEvents,
    rejectedEvents,
    upcomingEvents,
    totalRegistrations,
    totalAttended,
    registrationStatusBreakdown,
    eventsByCategory,
    monthlyRegistrationsRaw,
    totalStudents,
    totalTeachers,
    topDepartments,
    eventsByDepartmentRaw,
  ] = await Promise.all([
    Event.countDocuments(),
    Event.countDocuments({ status: 'pending' }),
    Event.countDocuments({ status: { $in: ['approved', 'hod_approved'] } }),
    Event.countDocuments({ status: 'rejected' }),
    Event.countDocuments({ status: { $in: ['approved', 'hod_approved'] }, date: { $gte: now } }),
    Registration.countDocuments(),
    Registration.countDocuments({ status: 'attended' }),
    Registration.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
    ]),
    Event.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { _id: 0, category: '$_id', count: 1 } },
    ]),
    Registration.aggregate([
      { $match: { registeredAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$registeredAt' }, month: { $month: '$registeredAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'teacher' }),
    Registration.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      { $group: { _id: '$student.department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, department: '$_id', count: 1 } },
    ]),
    Event.aggregate([
      { $group: { _id: { $ifNull: ['$department', 'Computer Science'] }, count: { $sum: 1 } } },
      { $project: { _id: 0, department: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const monthlyRegistrations = monthlyRegistrationsRaw.map(({ _id, count }) => ({
    month: `${_id.month.toString().padStart(2, '0')}/${_id.year}`,
    count,
  }));

  const attendanceRate = totalRegistrations > 0
    ? Math.round((totalAttended / totalRegistrations) * 100)
    : 0;

  res.status(200).json({
    success: true,
    data: {
      totalEvents,
      pendingEvents,
      approvedEvents,
      rejectedEvents,
      upcomingEvents,
      totalRegistrations,
      totalStudents,
      totalTeachers,
      totalAttended,
      attendanceRate,
      registrationStatusBreakdown,
      eventsByCategory,
      monthlyRegistrations,
      topDepartments,
      eventsByDepartment: eventsByDepartmentRaw,
    },
  });
};

module.exports = {
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
};
