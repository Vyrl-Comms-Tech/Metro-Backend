require('dotenv').config()

const required = (name) => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is missing from .env`)
  return value
}

const MB = 1024 * 1024

module.exports = {
  port: process.env.PORT || 5000,
  mongoUrl: required('MONGODB_URL'),
  corsOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),

  // optional: lets the backend backfill a year of daily gold prices (https://gold-api.com)
  goldApiKey: process.env.GOLD_API_KEY || '',

  storage: {
    bucket: required('STORAGE_BUCKET_NAME'),
    publicUrl: required('STORAGE_PUBLIC_DEV_URL').replace(/\/$/, ''),
    endpoint: required('R2_ENDPOINT'),
    accessKeyId: required('R2_ACCESS_KEY_ID'),
    secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
  },

  limits: {
    imageSize: 3 * MB,
    videoSize: 100 * MB,
    maxFiles: 10,
  },
}
