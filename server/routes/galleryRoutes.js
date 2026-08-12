const express = require('express');
const router = express.Router();
const { uploadGalleryImage, getAllGallery, getEventGallery, getMyGallery, deleteGalleryItem } = require('../controllers/galleryController');
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { upload, normalizeFilePath } = require('../config/cloudinary');

// Get all gallery items (public)
router.get('/', getAllGallery);

// Upload gallery image (restricted to Teacher / HOD)
router.post(
  '/upload',
  protect,
  roleMiddleware('teacher', 'hod'),
  upload.single('image'),
  normalizeFilePath,
  uploadGalleryImage
);

// Teacher's own gallery items
router.get('/my/list', protect, roleMiddleware('teacher', 'hod'), getMyGallery);

// Delete a gallery item
router.delete('/:id', protect, roleMiddleware('teacher', 'hod'), deleteGalleryItem);

// Get event gallery (public)
router.get('/:eventId', getEventGallery);

module.exports = router;

