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
    { expiresIn: '7d' }
  );
};

/**
 * Register a new user
 * POST /api/auth/register
 */
const registerUser = async (req, res) => {
  const { name, email, password, role, department, rollNumber, mobile } = req.body;

  if (!name || !email || !password || !role || !department) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, password, role, and department are required',
    });
  }

  // Validate rollNumber for students
  if (role === 'student' && !rollNumber?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Roll number is required for students',
    });
  }

  // Validate mobile number
  if (!mobile?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Mobile number is required',
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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide email and password',
    });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  if (user.status === 'inactive') {
    return res.status(403).json({
      success: false,
      error: 'Your account is deactivated. Please contact support.',
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      error: 'Invalid password',
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
