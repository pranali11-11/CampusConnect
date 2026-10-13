const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * Generates a signed JWT token for the user.
 * @param {object} user - User document.
 * @returns {string} The signed JWT.
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Register a new user
 * POST /api/auth/register
 */
const registerUser = async (req, res) => {
  const { name, email, password, role, department, rollNumber, mobile } = req.body || {};

  if (![name, email, password, role, department, mobile].every((value) => typeof value === 'string')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid registration details',
    });
  }

  if (!['student', 'teacher', 'hod'].includes(role)) {
    return res.status(400).json({
      success: false,
      error: 'This role cannot be assigned through public registration',
    });
  }

  if (
    name.trim().length < 3 || name.trim().length > 100 ||
    email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    password.length < 8 || password.length > 128 ||
    department.trim().length < 1 || department.trim().length > 100 ||
    !/^\d{10}$/.test(mobile.trim())
  ) {
    return res.status(400).json({
      success: false,
      error: 'Registration details are invalid or outside the allowed length',
    });
  }

  // Validate rollNumber for students
  if (role === 'student' && (typeof rollNumber !== 'string' || !rollNumber.trim() || rollNumber.trim().length > 50)) {
    return res.status(400).json({
      success: false,
      error: 'Roll number is required for students',
    });
  }

  const userExists = await User.findOne({ email: email.toLowerCase().trim() });
  if (userExists) {
    return res.status(400).json({
      success: false,
      error: 'User already exists with this email address',
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name: name.trim(),
    email: email.trim(), // Let Mongoose lowercase it via schema
    password: hashedPassword,
    role,
    department: department.trim(),
    rollNumber: role === 'student' ? rollNumber?.trim() : undefined,
    mobile: mobile?.trim(),
  });

  return res.status(201).json({
    success: true,
    message: 'Registered successfully',
    userId: user._id,
  });
};

/**
 * Authenticate a user and get token
 * POST /api/auth/login
 */
const loginUser = async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 128) {
    return res.status(400).json({
      success: false,
      error: 'Please provide email and password',
    });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password',
    });
  }

  if (user.status === 'inactive') {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password',
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password',
    });
  }

  const token = generateToken(user);

  return res.status(200).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    },
  });
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: user,
  });
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  generateToken,
};
