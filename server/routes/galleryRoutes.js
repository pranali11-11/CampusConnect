const express = require('express');
const router = express.Router();
const { uploadGalleryImage, getEventGallery, getMyGallery, deleteGalleryItem } = require('../controllers/galleryController');
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { upload } = require('../config/cloudinary');

// Upload gallery image (restricted to Teacher / HOD)
router.post(
  '/upload',
  protect,
  roleMiddleware('teacher', 'hod'),
  upload.single('image'),
  uploadGalleryImage
);

// Get event gallery (public)
// Teacher's own gallery items
router.get('/my/list', protect, roleMiddleware('teacher', 'hod'), getMyGallery);

// Delete a gallery item
router.delete('/:id', protect, roleMiddleware('teacher', 'hod'), deleteGalleryItem);

// Get event gallery (public)
router.get('/:eventId', getEventGallery);

module.exports = router;
