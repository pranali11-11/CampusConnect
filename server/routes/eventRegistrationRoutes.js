const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { getEventRegistrations } = require('../controllers/eventRegistrationController');

// Public enough for seat counting; no auth required
router.get('/:eventId/registrations', getEventRegistrations);

// Protected alternative (optional) could be added later.

module.exports = router;

