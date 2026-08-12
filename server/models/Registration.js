const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  teamLeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  registrationType: {
    type: String,
    enum: ['individual', 'team'],
    default: 'individual',
  },
  teamMembers: [
    {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
  ],
  qrData: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['registered', 'attended', 'cancelled'],
    default: 'registered',
  },
  paymentStatus: {
    type: String,
    enum: ['free', 'pending', 'paid'],
    default: 'free',
  },
  paymentAmount: {
    type: Number,
    default: 0,
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Registration', registrationSchema);
