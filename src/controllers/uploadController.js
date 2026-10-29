const { uploadToR2 } = require('../utils/r2')
const { limits } = require('../config/env')

async function uploadFiles(req, res) {
  const files = req.files || []
  if (!files.length) return res.status(400).json({ message: 'No files uploaded' })

  const tooBig = files.find((f) => f.mimetype.startsWith('image/') && f.size > limits.imageSize)
  if (tooBig) {
    return res.status(400).json({ message: `${tooBig.originalname} is larger than 3 MB` })
  }

  const urls = await Promise.all(files.map(uploadToR2))
  res.status(201).json({ urls })
}

module.exports = { uploadFiles }
