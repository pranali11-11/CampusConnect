// Load environment variables
require('dotenv').config();

// Core dependencies
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// Import express-async-errors to handle async routes exceptions automatically
require('express-async-errors');

// Configurations
const connectDB = require('./config/db');

// Import routers
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const contactRoutes = require('./routes/contactRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const eventRegistrationRoutes = require('./routes/eventRegistrationRoutes');

// Import error handler
const errorHandler = require('./middleware/errorHandler');

// Initialize app
const app = express();

// Middleware
const frontendOrigin = process.env.FRONTEND_ORIGIN || process.env.CLIENT_URL;
const allowedOrigins = new Set([frontendOrigin].filter(Boolean));
if (process.env.NODE_ENV !== 'production') {
  ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173']
    .forEach((origin) => allowedOrigins.add(origin));
}

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(mongoSanitize());

// Serve static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Log basic requests in dev
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRegistrationRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root route check
app.get('/health', (req, res) => {
  res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
    success: mongoose.connection.readyState === 1,
    status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable',
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CampusConnect College Event Management API is online',
  });
});

// Catch 404 Route Not Found
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'API route not found',
  });
});

// Global Error Handler Middleware
app.use(errorHandler);

// Start server after connecting to database
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  const startServer = async () => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is required');
    }
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must contain at least 32 characters');
    }
    if (process.env.NODE_ENV === 'production' && !frontendOrigin) {
      throw new Error('FRONTEND_ORIGIN is required in production');
    }

    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  };

  startServer().catch((error) => {
    console.error(`Server startup failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = app; // Export for testing
