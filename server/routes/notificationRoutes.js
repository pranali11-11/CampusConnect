const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  readAllNotifications,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// All notification routes are private to the user
router.use(protect);

router.get('/my', getMyNotifications);
router.patch('/read-all', readAllNotifications);

module.exports = router;
