const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to protect routes and verify JWT tokens.
 */
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && /^Bearer\s+/i.test(req.headers.authorization)) {
    try {
      // Extract the token
      token = req.headers.authorization.split(/\s+/)[1];

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Retrieve user from database to ensure they exist and are active
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user not found',
        });
      }

      if (user.status === 'inactive') {
        return res.status(403).json({
          success: false,
          message: 'User account is inactive',
        });
      }

      // Attach user details to the request object
      req.user = {
        id: user._id.toString(),
        role: user.role,
        name: user.name,
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token validation failed',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token missing',
    });
  }
};

module.exports = { protect };
