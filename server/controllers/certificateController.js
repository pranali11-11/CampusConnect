const Certificate = require('../models/Certificate');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Loads the certificate template image buffer from local disk or remote URL.
 * Throws an error if the template cannot be retrieved.
 */
async function loadTemplateImageBuffer(templatePath) {
  if (!templatePath || typeof templatePath !== 'string' || !templatePath.trim()) {
    throw new Error('No certificate template path provided');
  }

  const cleanPath = templatePath.trim();

  // 1. If HTTP or HTTPS URL (e.g. Cloudinary)
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    const fetchResponse = await fetch(cleanPath);
    if (!fetchResponse.ok) {
      throw new Error(`Failed to load certificate template from URL (HTTP ${fetchResponse.status})`);
    }
    const arrayBuffer = await fetchResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // 2. Direct exact filesystem path
  if (fs.existsSync(cleanPath)) {
    return fs.readFileSync(cleanPath);
  }

  // 3. In server uploads directory via basename
  const filename = path.basename(cleanPath);
  const uploadsDir = path.join(__dirname, '../uploads');
  const inUploads = path.join(uploadsDir, filename);
  if (fs.existsSync(inUploads)) {
    return fs.readFileSync(inUploads);
  }

  // 4. Normalized relative to project root / server
  const normalized = cleanPath.replace(/^[\\/]+/, '');
  const fromServer = path.join(__dirname, '..', normalized);
  if (fs.existsSync(fromServer)) {
    return fs.readFileSync(fromServer);
  }

  throw new Error(`Certificate template file not found on server: ${filename}`);
}

/**
 * Retrieve all certificates for the logged-in student
 * GET /api/certificates/my
 * Access: Private (Student only)
 */
const getMyCertificates = async (req, res) => {
  const certificates = await Certificate.find({ studentId: req.user.id })
    .populate({
      path: 'eventId',
      select: 'title category description venue date time department certificateTemplate',
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
      select: 'title category description venue date time department certificateTemplate',
      populate: {
        path: 'createdBy coordinatorId',
        select: 'name email department mobile',
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
 * Create PDF certificate using ONLY the teacher's uploaded template.
 * System strictly disallows default templates.
 */
async function createCertificatePDF(registration) {
  const event = registration.eventId;
  const student = registration.studentId;

  const templatePath = event?.certificateTemplate?.trim();
  if (!templatePath) {
    throw new Error('Certificate generation failed: No certificate template was uploaded by the teacher for this event.');
  }

  const imageBuffer = await loadTemplateImageBuffer(templatePath);
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error('Certificate generation failed: Could not load the uploaded certificate template image.');
  }

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Embed the teacher's template image (detect PNG vs JPEG)
  let embeddedImage;
  const isPng = imageBuffer.length > 4 &&
    imageBuffer[0] === 0x89 &&
    imageBuffer[1] === 0x50 &&
    imageBuffer[2] === 0x4e &&
    imageBuffer[3] === 0x47;

  if (isPng) {
    try {
      embeddedImage = await pdfDoc.embedPng(imageBuffer);
    } catch {
      embeddedImage = await pdfDoc.embedJpg(imageBuffer);
    }
  } else {
    try {
      embeddedImage = await pdfDoc.embedJpg(imageBuffer);
    } catch {
      embeddedImage = await pdfDoc.embedPng(imageBuffer);
    }
  }

  const { width, height } = embeddedImage;
  const page = pdfDoc.addPage([width, height]);

  // Draw teacher's uploaded template to fill the whole page
  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width,
    height,
  });

  // Embed standard fonts for certificate typography
  const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const studentName = String(student?.name || 'Participant').trim();
  const eventTitle = String(event?.title || 'Campus Event').trim();
  const departmentName = String(event?.department || student?.department || 'Academic Affairs').trim();
  const certId = String(registration._id);
  const issueDateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const eventDateStr = event?.date
    ? new Date(event.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const centerX = width / 2;

  // 1. Recipient Student Name (prominent and elegant)
  const nameFontSize = Math.max(26, Math.min(42, Math.round(height * 0.065)));
  const nameWidth = titleFont.widthOfTextAtSize(studentName, nameFontSize);
  const nameY = Math.round(height * 0.48);

  page.drawText(studentName, {
    x: Math.max(30, centerX - nameWidth / 2),
    y: nameY,
    size: nameFontSize,
    font: titleFont,
    color: rgb(0.08, 0.12, 0.28),
  });

  // Decorative gold underline below student name
  const lineY = nameY - 6;
  const halfLineWidth = Math.min(width * 0.4, nameWidth / 2 + 30);
  page.drawLine({
    start: { x: centerX - halfLineWidth, y: lineY },
    end: { x: centerX + halfLineWidth, y: lineY },
    thickness: 1.5,
    color: rgb(0.8, 0.65, 0.25),
  });

  // 2. Event Citation Text
  const citationText = `for active participation and completion of "${eventTitle}"`;
  const citationFontSize = Math.max(13, Math.min(18, Math.round(height * 0.028)));
  const citationWidth = italicFont.widthOfTextAtSize(citationText, citationFontSize);
  page.drawText(citationText, {
    x: Math.max(30, centerX - citationWidth / 2),
    y: Math.round(height * 0.39),
    size: citationFontSize,
    font: italicFont,
    color: rgb(0.2, 0.2, 0.25),
  });

  // 3. Department & Date Detail
  const deptDetailText = `Conducted by Department of ${departmentName}${eventDateStr ? ` • ${eventDateStr}` : ''}`;
  const deptFontSize = Math.max(11, Math.min(14, Math.round(height * 0.022)));
  const deptWidth = regularFont.widthOfTextAtSize(deptDetailText, deptFontSize);
  page.drawText(deptDetailText, {
    x: Math.max(30, centerX - deptWidth / 2),
    y: Math.round(height * 0.33),
    size: deptFontSize,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.35),
  });

  // 4. Verification ID (bottom left) & Issue Date (bottom right)
  const idText = `Verification ID: ${certId}`;
  const dateText = `Issued: ${issueDateStr}`;
  const footerFontSize = Math.max(9, Math.min(11, Math.round(height * 0.018)));

  page.drawText(idText, {
    x: Math.round(width * 0.08),
    y: Math.round(height * 0.08),
    size: footerFontSize,
    font: regularFont,
    color: rgb(0.4, 0.4, 0.45),
  });

  const dateWidth = regularFont.widthOfTextAtSize(dateText, footerFontSize);
  page.drawText(dateText, {
    x: Math.round(width * 0.92) - dateWidth,
    y: Math.round(height * 0.08),
    size: footerFontSize,
    font: regularFont,
    color: rgb(0.4, 0.4, 0.45),
  });

  const pdfBytes = await pdfDoc.save();

  // Save PDF file to server uploads/certificates directory
  const certDir = path.join(__dirname, '../uploads/certificates');
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  const certFileName = `cert_${registration._id}.pdf`;
  const certFilePath = path.join(certDir, certFileName);
  fs.writeFileSync(certFilePath, Buffer.from(pdfBytes));

  return {
    pdfBytes,
    certificateUrl: `/uploads/certificates/${certFileName}`,
  };
}

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

  // Eligibility check 3: MANDATORY - Teacher must have uploaded a certificate template
  const templatePath = registration.eventId.certificateTemplate?.trim();
  if (!templatePath) {
    res.status(400);
    throw new Error(
      'Certificate generation is not permitted: The teacher has not uploaded a certificate template for this event.'
    );
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

  // Generate PDF certificate using the teacher's uploaded template
  try {
    const { pdfBytes, certificateUrl } = await createCertificatePDF(registration);

    // Create certificate record
    const certificate = await Certificate.create({
      registrationId: registration._id,
      studentId: registration.studentId._id,
      eventId: registration.eventId._id,
      certificateUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Certificate generated successfully using the uploaded template',
      data: certificate,
    });
  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500);
    throw new Error('Failed to generate certificate: ' + error.message);
  }
};

/**
 * Download certificate PDF generated using the teacher's template
 * GET /api/certificates/:id/download
 * Access: Private (Student or Teacher/HOD)
 */
const downloadCertificate = async (req, res) => {
  const certificate = await Certificate.findById(req.params.id)
    .populate('studentId')
    .populate({
      path: 'eventId',
      populate: { path: 'coordinatorId' },
    })
    .populate('registrationId');

  if (!certificate) {
    res.status(404);
    throw new Error('Certificate not found');
  }

  // Security check: Student can only download their own certificate
  if (req.user.role === 'student' && certificate.studentId._id.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Forbidden: You are not authorized to download this certificate');
  }

  const templatePath = certificate.eventId?.certificateTemplate?.trim();
  if (!templatePath) {
    res.status(400);
    throw new Error('Cannot download certificate: No certificate template was uploaded by the teacher for this event.');
  }

  // If already generated and stored on disk, stream the existing file
  const certFilePath = certificate.certificateUrl
    ? path.join(__dirname, '..', certificate.certificateUrl.replace(/^[\\/]+/, ''))
    : path.join(__dirname, '../uploads/certificates', `cert_${certificate.registrationId?._id || certificate._id}.pdf`);

  let pdfBytes;
  if (fs.existsSync(certFilePath)) {
    pdfBytes = fs.readFileSync(certFilePath);
  } else {
    // Regenerate on the fly using teacher's template
    const registrationObj = {
      _id: certificate.registrationId?._id || certificate._id,
      eventId: certificate.eventId,
      studentId: certificate.studentId,
    };
    const result = await createCertificatePDF(registrationObj);
    pdfBytes = result.pdfBytes;
  }

  const sanitizedStudentName = (certificate.studentId?.name || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Certificate_${sanitizedStudentName}_${certificate._id}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(pdfBytes));
};

module.exports = {
  getMyCertificates,
  getCertificateById,
  generateCertificate,
  downloadCertificate,
  createCertificatePDF,
  loadTemplateImageBuffer,
};
