const Certificate = require('../models/Certificate');

/**
 * Retrieve all certificates for the logged-in student
 * GET /api/certificates/my
 * Access: Private (Student only)
 */
const getMyCertificates = async (req, res) => {
  const certificates = await Certificate.find({ studentId: req.user.id })
    .populate({
      path: 'eventId',
      select: 'title category description venue date time',
      populate: {
        path: 'coordinatorId',
        select: 'name email mobile department',
      },
    })
    .sort({ generatedAt: -1 });

  res.status(200).json({
    success: true,
    count: certificates.length,
    data: certificates,
  });
};

/**
 * Get a specific certificate details
 * GET /api/certificates/:id
 * Access: Private
 */
const getCertificateById = async (req, res) => {
  const certificate = await Certificate.findById(req.params.id)
    .populate({
      path: 'studentId',
      select: 'name email rollNumber department mobile',
    })
    .populate({
      path: 'eventId',
      select: 'title category description venue date time',
      populate: {
        path: 'createdBy',
        select: 'name email department',
      },
    });

  if (!certificate) {
    res.status(404);
    throw new Error('Certificate not found');
  }

  // Security: Check if student owns the certificate, or user is teacher/hod
  if (
    req.user.role === 'student' &&
    certificate.studentId._id.toString() !== req.user.id
  ) {
    res.status(403);
    throw new Error('Forbidden: You are not authorized to access this certificate');
  }

  res.status(200).json({
    success: true,
    data: certificate,
  });
};

module.exports = {
  getMyCertificates,
  getCertificateById,
};
