const Certificate = require('../models/Certificate');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

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

/**
 * Generate certificate for a registration
 * POST /api/certificates/generate
 * Access: Private (Student only)
 */
const generateCertificate = async (req, res) => {
  const { registrationId } = req.body;

  if (!registrationId) {
    res.status(400);
    throw new Error('Registration ID is required');
  }

  // Get registration with event and student details
  const registration = await Registration.findById(registrationId)
    .populate('eventId')
    .populate('studentId');

  if (!registration) {
    res.status(404);
    throw new Error('Registration not found');
  }

  // Check if user owns this registration
  if (registration.studentId._id.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Forbidden: You can only generate certificates for your own registrations');
  }

  // Eligibility check 1: Student must be marked as attended
  if (registration.status !== 'attended') {
    res.status(400);
    throw new Error('Certificate not available: You must be marked as attended to receive a certificate');
  }

  // Eligibility check 2: Event must have ended
  const eventDate = new Date(registration.eventId.date);
  const now = new Date();
  if (eventDate > now) {
    res.status(400);
    throw new Error('Certificate not available: The event has not ended yet');
  }

  // Check if certificate already exists
  const existingCertificate = await Certificate.findOne({ registrationId: registration._id });
  if (existingCertificate) {
    res.status(200).json({
      success: true,
      message: 'Certificate already generated',
      data: existingCertificate,
    });
    return;
  }

  // Generate PDF certificate
  try {
    const pdfBytes = await createCertificatePDF(registration);

    // Create certificate record
    const certificate = await Certificate.create({
      registrationId: registration._id,
      studentId: registration.studentId._id,
      eventId: registration.eventId._id,
    });

    res.status(201).json({
      success: true,
      message: 'Certificate generated successfully',
      data: certificate,
    });
  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500);
    throw new Error('Failed to generate certificate: ' + error.message);
  }
};

/**
 * Create PDF certificate using pdf-lib
 */
async function createCertificatePDF(registration) {
  const event = registration.eventId;
  const student = registration.studentId;

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 landscape

  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // If event has a custom template, use it (simplified - would need canvas for image overlay)
  // For now, use a clean HTML-style layout with pdf-lib

  // Draw border
  page.drawRectangle({
    x: 50,
    y: 50,
    width: 742,
    height: 495,
    borderColor: rgb(0.2, 0.4, 0.8),
    borderWidth: 3,
  });

  // Header
  page.drawText('CERTIFICATE OF ATTENDANCE', {
    x: 421,
    y: 520,
    size: 32,
    font: boldFont,
    color: rgb(0.2, 0.4, 0.8),
    alignment: 'center',
  });

  // Subtitle
  page.drawText('This certificate is proudly presented to', {
    x: 421,
    y: 460,
    size: 14,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
    alignment: 'center',
  });

  // Student name
  page.drawText(student.name, {
    x: 421,
    y: 420,
    size: 28,
    font: boldFont,
    color: rgb(0, 0, 0),
    alignment: 'center',
  });

  // Event description
  page.drawText(`for successfully attending the event`, {
    x: 421,
    y: 380,
    size: 14,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
    alignment: 'center',
  });

  // Event name
  page.drawText(`"${event.title}"`, {
    x: 421,
    y: 340,
    size: 20,
    font: boldFont,
    color: rgb(0.2, 0.4, 0.8),
    alignment: 'center',
  });

  // Event details
  page.drawText(`Category: ${event.category}`, {
    x: 421,
    y: 300,
    size: 12,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
    alignment: 'center',
  });

  page.drawText(`Date: ${event.date}`, {
    x: 421,
    y: 280,
    size: 12,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
    alignment: 'center',
  });

  page.drawText(`Venue: ${event.venue}`, {
    x: 421,
    y: 260,
    size: 12,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
    alignment: 'center',
  });

  // Footer
  page.drawText(`Certificate ID: ${registration._id}`, {
    x: 421,
    y: 100,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
    alignment: 'center',
  });

  page.drawText(`Generated on: ${new Date().toLocaleDateString()}`, {
    x: 421,
    y: 80,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
    alignment: 'center',
  });

  // Serialize the PDFDocument to bytes
  const pdfBytes = await pdfDoc.save();

  return pdfBytes;
}

module.exports = {
  getMyCertificates,
  getCertificateById,
  generateCertificate,
};
