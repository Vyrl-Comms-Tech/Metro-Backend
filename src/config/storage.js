const { S3Client } = require('@aws-sdk/client-s3')
const { storage } = require('./env')

// Cloudflare R2 speaks the S3 API
const r2 = new S3Client({
  region: 'auto',
  endpoint: storage.endpoint,
  credentials: { accessKeyId: storage.accessKeyId, secretAccessKey: storage.secretAccessKey },
})

module.exports = r2
