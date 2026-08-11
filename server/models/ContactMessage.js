const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    trim: true,
    lowercase: true,
  },
  subject: {
    type: String,
    required: [true, 'Please specify a subject'],
    trim: true,
  },
  message: {
    type: String,
    required: [true, 'Please provide a message'],
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
