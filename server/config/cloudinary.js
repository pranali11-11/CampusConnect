const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Ensure uploads directory exists for local storage fallback
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const isCloudinaryConfigured = () => {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  return Boolean(
    name &&
      key &&
      secret &&
      name !== 'your_cloudinary_cloud_name' &&
      key !== 'your_cloudinary_api_key'
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Configure Multer storage: Cloudinary if configured, otherwise DiskStorage
let multerStorage;

if (isCloudinaryConfigured()) {
  multerStorage = {
    _handleFile(req, file, callback) {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'campusconnect_banners',
          allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'avif'],
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return callback(error);
          callback(null, {
            path: result.secure_url,
            secure_url: result.secure_url,
            filename: result.public_id,
            public_id: result.public_id,
            size: result.bytes,
            format: result.format,
          });
        }
      );
      file.stream.pipe(uploadStream);
    },

    _removeFile(req, file, callback) {
      if (!file.public_id) return callback(null);
      cloudinary.uploader.destroy(file.public_id).then(() => callback(null), callback);
    },
  };
} else {
  multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
      cb(null, `${Date.now()}_${cleanName}${ext}`);
    },
  });
}

const uploadBanner = multer({
  storage: multerStorage,
  fileFilter: (req, file, callback) => {
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.mimetype)) {
      return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
    callback(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
    fields: 50,
    parts: 55,
  },
});

// Middleware to normalize req.file.path for local uploads
const normalizeFilePath = (req, res, next) => {
  if (req.file && !isCloudinaryConfigured()) {
    req.file.path = `/uploads/${req.file.filename}`;
  }
  next();
};

/**
 * Uploads a file buffer or file stream to Cloudinary or Local Storage.
 */
const uploadToCloudinary = (fileBuffer, folder = 'campusconnect') => {
  return new Promise((resolve, reject) => {
    if (isCloudinaryConfigured()) {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(fileBuffer);
    } else {
      // Local disk fallback
      try {
        const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, fileBuffer);
        resolve({
          secure_url: `/uploads/${filename}`,
          public_id: filename,
        });
      } catch (err) {
        reject(err);
      }
    }
  });
};

module.exports = {
  cloudinary,
  uploadBanner,
  upload: uploadBanner,
  normalizeFilePath,
  uploadToCloudinary,
  isCloudinaryConfigured,
};

