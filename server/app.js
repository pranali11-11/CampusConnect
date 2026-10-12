// Load environment variables
require('dotenv').config();

// Core dependencies
const express = require('express');
const cors = require('cors');
const path = require('path');

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
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Log basic requests in dev
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
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
    error: `API Route Not Found - ${req.originalUrl}`,
  });
});

// Global Error Handler Middleware
app.use(errorHandler);

// Start server after connecting to database
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  });
}

module.exports = app; // Export for testing
