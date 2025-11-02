const multer = require('multer');
const config = require('../config');

// Configure multer to store files in memory (we'll upload to Supabase)
const storage = multer.memoryStorage();

// File filter for avatar uploads
const fileFilter = (req, file, cb) => {
  if (config.upload.allowed_avatar_types.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${config.upload.allowed_avatar_types.join(', ')}`), false);
  }
};

// Multer configuration for avatar uploads
const avatarUpload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.max_avatar_size
  },
  fileFilter: fileFilter
});

module.exports = {
  avatarUpload: avatarUpload.single('avatar')
};

