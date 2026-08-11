const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const { getAnalyticsSummary } = require('../controllers/analyticsController');

// Analytics are private (role-based)
router.use(protect);
router.get('/summary', roleMiddleware('hod', 'teacher'), getAnalyticsSummary);

module.exports = router;

