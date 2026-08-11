const ContactMessage = require('../models/ContactMessage');

/**
 * Submit a contact form message
 * POST /api/contact
 * Access: Public
 */
const submitContactMessage = async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    res.status(400);
    throw new Error('Please fill in all contact message fields');
  }

  const contactMessage = await ContactMessage.create({
    name,
    email,
    subject,
    message,
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
