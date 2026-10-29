const multer = require('multer')
const { limits } = require('../config/env')

// files are kept in memory, then sent to Cloudflare R2 by the upload controller
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: limits.videoSize, files: limits.maxFiles },
  fileFilter: (req, file, cb) =>
    /^(image|video)\//.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only image or video files are allowed')),
})

module.exports = { upload }
