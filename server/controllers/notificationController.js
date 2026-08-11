const Notification = require('../models/Notification');

/**
 * Get all notifications for the authenticated user
 * GET /api/notifications/my
 * Access: Private
 */
const getMyNotifications = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user.id })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications,
  });
};

/**
 * Mark all notifications as read for the authenticated user
 * PATCH /api/notifications/read-all
 * Access: Private
 */
const readAllNotifications = async (req, res) => {
  await Notification.updateMany(
    { userId: req.user.id, isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
  });
};

module.exports = {
  getMyNotifications,
  readAllNotifications,
};
