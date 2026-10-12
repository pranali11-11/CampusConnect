const ContactMessage = require('../models/ContactMessage');

/**
 * Submit a contact form message
 * POST /api/contact
 * Access: Public
 */
const submitContactMessage = async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (
    [name, email, subject, message].some((value) => typeof value !== 'string' || !value.trim()) ||
    name.trim().length > 100 || email.trim().length > 254 ||
    subject.trim().length > 200 || message.trim().length > 5000 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return res.status(400).json({
      success: false,
      error: 'Please provide valid contact message details',
    });
  }

  const contactMessage = await ContactMessage.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    subject: subject.trim(),
    message: message.trim(),
  });

  res.status(201).json({
    success: true,
    message: 'Your message has been submitted successfully. We will get back to you shortly.',
    data: contactMessage,
  });
};

module.exports = {
  submitContactMessage,
};
