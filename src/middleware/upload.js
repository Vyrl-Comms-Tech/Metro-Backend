const { randomUUID } = require('node:crypto')
const { mkdirSync } = require('node:fs')
const path = require('node:path')
const multer = require('multer')

const UPLOAD_DIR = path.join(__dirname, '../../uploads')
mkdirSync(UPLOAD_DIR, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024, files: 10 }, // 100 MB each (reel videos)
  fileFilter: (req, file, cb) =>
    /^(image|video)\//.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only image or video files are allowed')),
})

module.exports = { upload, UPLOAD_DIR }
