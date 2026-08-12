const Gallery = require('../models/Gallery');
const Event = require('../models/Event');
const { uploadToCloudinary } = require('../config/cloudinary');

/**
 * Upload an image to the gallery for a specific event
 * POST /api/gallery/upload
 * Access: Private (Teacher / HOD)
 */
/**
 * Upload an image to the gallery for a specific event
 * POST /api/gallery/upload
 * Access: Private (Teacher / HOD)
 */
const uploadGalleryImage = async (req, res) => {
  const { eventId, category } = req.body;

  if (!eventId) {
    res.status(400);
    throw new Error('Please provide an eventId');
  }

  if (!req.file) {
    res.status(400);
    throw new Error('Please upload an image file');
  }

  // Verify event exists
  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  try {
    const imageUrl =
      req.file?.path ||
      req.file?.secure_url ||
      req.file?.url ||
      req.file?.location ||
      '';
    const publicId = req.file?.public_id || req.file?.filename || '';

    if (!imageUrl) {
      res.status(400);
      throw new Error('Unable to resolve uploaded file URL');
    }

    // Save record to database
    const galleryItem = await Gallery.create({
      eventId,
      imageUrl,
      publicId,
      uploadedBy: req.user.id,
      category: category || event.category,
    });

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully to gallery',
      data: galleryItem,
    });
  } catch (error) {
    console.error('Gallery image upload failure:', error);
    res.status(500);
    throw new Error('Failed to upload gallery image: ' + error.message);
  }
};

/**
 * Retrieve all gallery images across events (public)
 * GET /api/gallery
 */
const getAllGallery = async (req, res) => {
  const filter = {};
  if (req.query.category && req.query.category !== 'All') {
    filter.category = req.query.category;
  }

  const galleryItems = await Gallery.find(filter)
    .populate('eventId', 'title category date venue description')
    .populate('uploadedBy', 'name email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: galleryItems.length,
    data: galleryItems,
  });
};

/**
 * Retrieve all gallery images for a specific event
 * GET /api/gallery/:eventId
 * Access: Public
 */
const getEventGallery = async (req, res) => {
  const { eventId } = req.params;

  const galleryItems = await Gallery.find({ eventId })
    .populate('eventId', 'title category date venue')
    .populate('uploadedBy', 'name email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: galleryItems.length,
    data: galleryItems,
  });
};

/**
 * Get gallery images uploaded by the logged-in teacher
 * GET /api/gallery/my
 */
const getMyGallery = async (req, res) => {
  const items = await Gallery.find({ uploadedBy: req.user.id })
    .populate('eventId', 'title category')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: items.length, data: items });
};

/**
 * Delete a gallery image by id (also remove from Cloudinary)
 * DELETE /api/gallery/:id
 */
const deleteGalleryItem = async (req, res) => {
  const { id } = req.params;
  const item = await Gallery.findById(id);
  if (!item) {
    res.status(404);
    throw new Error('Gallery item not found');
  }
  // Only uploader or HOD can delete
  if (item.uploadedBy.toString() !== req.user.id && req.user.role !== 'hod') {
    res.status(403);
    throw new Error('Forbidden: You cannot delete this image');
  }

  // Delete from Cloudinary if publicId exists
  try {
    if (item.publicId) {
      const { cloudinary } = require('../config/cloudinary');
      await cloudinary.uploader.destroy(item.publicId);
    }
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }

  await item.deleteOne();
  res.status(200).json({ success: true, message: 'Gallery item deleted' });
};

module.exports = {
  uploadGalleryImage,
  getAllGallery,
  getEventGallery,
  getMyGallery,
  deleteGalleryItem,
};

