const { S3Client } = require('@aws-sdk/client-s3')

// Cloudflare R2 speaks the S3 API
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

module.exports = r2
