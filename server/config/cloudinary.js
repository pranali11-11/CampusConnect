const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer storage using CloudinaryStorage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'campusconnect_banners',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const uploadBanner = multer({ storage: storage });

/**
 * Uploads a file buffer to Cloudinary (helper).
 */
const uploadToCloudinary = (fileBuffer, folder = 'campusconnect') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

module.exports = {
  cloudinary,
  uploadBanner,
  upload: uploadBanner,
  storage,
  uploadToCloudinary,
};
