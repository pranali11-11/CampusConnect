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
    enum: ['pending_approval', 'registered', 'attended', 'cancelled', 'rejected'],
    default: 'pending_approval',
  },
  paymentStatus: {
    type: String,
    enum: ['free', 'pending', 'verified', 'flagged', 'paid', 'rejected'],
    default: 'free',
  },
  paymentAmount: {
    type: Number,
    default: 0,
  },
  transactionId: {
    type: String,
    default: '',
    trim: true,
    validate: {
      validator: function(v) {
        // If provided, must be exactly 12 digits
        if (v && v !== '') {
          return /^\d{12}$/.test(v);
        }
        return true;
      },
      message: 'UTR must be exactly 12 digits'
    }
  },
  paymentScreenshot: {
    type: String,
    default: '',
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Registration', registrationSchema);
