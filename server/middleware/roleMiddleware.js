/**
 * Middleware to restrict access based on user roles.
 * @param {...string} allowedRoles - List of roles permitted to access the route.
 */
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized, no user context found',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied. Allowed roles: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};

module.exports = roleMiddleware;
