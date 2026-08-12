require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Attendance = require('../models/Attendance');
const Certificate = require('../models/Certificate');
const Gallery = require('../models/Gallery');

const uploadsDir = path.join(__dirname, '..', 'uploads');

const clearUploadsFolder = async () => {
  if (!fs.existsSync(uploadsDir)) return;

  const files = fs.readdirSync(uploadsDir);
  for (const file of files) {
    const fullPath = path.join(uploadsDir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      fs.unlinkSync(fullPath);
    }
  }
};

const resetEvents = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set in the environment');
  }

  await mongoose.connect(uri);

  const eventCount = await Event.countDocuments();
  const registrationCount = await Registration.countDocuments();
  const attendanceCount = await Attendance.countDocuments();
  const certificateCount = await Certificate.countDocuments();
  const galleryCount = await Gallery.countDocuments();

  await Promise.all([
    Event.deleteMany({}),
    Registration.deleteMany({}),
    Attendance.deleteMany({}),
    Certificate.deleteMany({}),
    Gallery.deleteMany({}),
  ]);

  await clearUploadsFolder();

  console.log(JSON.stringify({
    deletedEvents: eventCount,
    deletedRegistrations: registrationCount,
    deletedAttendance: attendanceCount,
    deletedCertificates: certificateCount,
    deletedGallery: galleryCount,
    uploadsCleared: true,
  }, null, 2));

  await mongoose.disconnect();
};

resetEvents()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Reset failed:', error.message);
    process.exit(1);
  });
