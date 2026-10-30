const multer = require('multer')

const MB = 1024 * 1024
const MAX_IMAGE_SIZE = 3 * MB
const MAX_VIDEO_SIZE = 100 * MB
const MAX_FILES = 10

// files are kept in memory, then sent to Cloudflare R2 by the upload controller
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) =>
    /^(image|video)\//.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only image or video files are allowed')),
})

module.exports = { upload, MAX_IMAGE_SIZE }
