/**
 * Global Express error handling middleware.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status ||
    (err.type === 'entity.too.large' ? 413 : res.statusCode !== 200 ? res.statusCode : 500);
  if (process.env.NODE_ENV === 'production') {
    console.error('Request failed:', { name: err.name || 'Error', statusCode });
  } else {
    console.error('Unhandled Server Error:', err);
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Request body is too large' });
  }

  if (err.name === 'MulterError') {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      success: false,
      error: status === 413 ? 'Uploaded file is too large' : 'Invalid file upload',
    });
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      error: 'Invalid resource identifier format',
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

  const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};

module.exports = errorHandler;
