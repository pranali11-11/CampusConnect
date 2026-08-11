const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  registrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Registration',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Certificate', certificateSchema);
