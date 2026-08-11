const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'teacher', 'hod'],
      required: [true, 'Please select a role'],
    },
    department: {
      type: String,
      required: [true, 'Please specify a department'],
      trim: true,
    },
    rollNumber: {
      type: String,
      trim: true,
      required: function () {
        return this.role === 'student';
      },
    },
    mobile: {
      type: String,
      required: [true, 'Please provide a mobile number'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true, // Auto handles createdAt and updatedAt
  }
);

// Hash password before saving (skip if already bcrypt-hashed from controller)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
