const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['present', 'absent'],
    default: 'present',
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  markedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Attendance', attendanceSchema);
