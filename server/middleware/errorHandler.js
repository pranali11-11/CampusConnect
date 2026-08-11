/**
 * Global Express error handling middleware.
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log full error trace for development debugging
  console.error('Unhandled Server Error:', err);

  // Handle Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    const message = `Invalid resource identifier format: ${err.value}`;
    return res.status(404).json({
      success: false,
      error: message,
    });
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyValue)[0];
    const message = `Duplicate value error: A record with that ${duplicateField} already exists.`;
    return res.status(400).json({
      success: false,
      error: message,
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    return res.status(400).json({
      success: false,
      error: message,
    });
  }

  // Send generic or custom status code errors
  res.status(err.statusCode || 500).json({
    success: false,
    error: error.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;
