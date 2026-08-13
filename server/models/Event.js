const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an event title'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['Technical', 'Cultural', 'Sports', 'Workshop'],
      required: [true, 'Please specify an event category'],
    },
    description: {
      type: String,
      required: [true, 'Please provide an event description'],
    },
    venue: {
      type: String,
      required: [true, 'Please specify the venue'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Please specify the event date'],
    },
    time: {
      type: String,
      required: [true, 'Please specify the event time'],
    },
    maxParticipants: {
      type: Number,
      required: [true, 'Please specify maximum participants'],
      min: [1, 'Maximum participants must be at least 1'],
    },
    registrationDeadline: {
      type: Date,
      required: [true, 'Please specify the registration deadline'],
    },
    registrationFee: {
      type: Number,
      default: 0,
      min: [0, 'Registration fee cannot be negative'],
    },
    paymentNumber: {
      type: String,
      default: '',
      trim: true,
    },
    whatsappGroupLink: {
      type: String,
      default: '',
      trim: true,
    },
    certificateTemplate: {
      type: String,
      default: '',
    },
    registrationBannerUrl: {
      type: String,
      default: '',
    },
    bannerUrl: {
      type: String,
      default: '',
    },
    registrationType: {
      type: String,
      enum: ['individual', 'team'],
      default: 'individual',
    },
    minTeamSize: {
      type: Number,
      default: 2,
      min: [1, 'Minimum team size must be at least 1'],
    },
    maxTeamSize: {
      type: Number,
      default: 4,
      min: [1, 'Maximum team size must be at least 1'],
    },
    status: {
      type: String,
      enum: ['pending', 'hod_approved', 'approved', 'rejected'],
      default: 'pending',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedByHOD: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    coordinatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Event', eventSchema);
