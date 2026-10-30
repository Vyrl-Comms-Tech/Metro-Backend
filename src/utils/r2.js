const { randomUUID } = require('node:crypto')
const path = require('node:path')
const { PutObjectCommand } = require('@aws-sdk/client-s3')
const r2 = require('../config/storage')

// uploads a multer memory file to R2 and returns its public URL
async function uploadToR2(file) {
  const key = `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.STORAGE_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  )
  return `${process.env.STORAGE_PUBLIC_DEV_URL.replace(/\/$/, '')}/${key}`
}

module.exports = { uploadToR2 }
