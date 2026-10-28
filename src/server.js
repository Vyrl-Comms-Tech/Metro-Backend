require('dotenv').config()
const cors = require('cors')
const express = require('express')
const mongoose = require('mongoose')
const routes = require('./routes')
const { UPLOAD_DIR } = require('./middleware/upload')

const PORT = process.env.PORT || 5000
const BASE = `http://localhost:${PORT}`

const app = express()

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json())

// ---- routes ----------------------------------------------------------------
// Open http://localhost:5000 in the browser to see this list.
const ENDPOINTS = {
  products: '/api/products',
  categories: '/api/categories',
  faqs: '/api/faqs',
  reels: '/api/reels',
  content: '/api/content',
  upload: 'POST /api/uploads',
  health: '/api/health',
}

app.get('/', (req, res) => {
  res.json({ message: 'Metro Jewellers API is running', endpoints: ENDPOINTS })
})
app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api', routes) // products, categories, faqs, reels, content, uploads
app.use('/uploads', express.static(UPLOAD_DIR)) // uploaded images and videos

app.use((req, res) => res.status(404).json({ message: 'Route not found' }))

// ---- errors ----------------------------------------------------------------
// turns Mongoose and upload errors into readable responses
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message, fields: Object.keys(err.errors) })
  }
  if (err.name === 'MulterError' || err.message === 'Only image or video files are allowed') {
    return res.status(400).json({ message: err.message })
  }
  if (err.name === 'CastError') return res.status(400).json({ message: `Invalid ${err.path}` })
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Already exists', fields: Object.keys(err.keyValue) })
  }

  console.error(err)
  res.status(500).json({ message: 'Something went wrong' })
})

// ---- start -----------------------------------------------------------------
async function start() {
  try {
    if (!process.env.MONGO_DB_URL) throw new Error('MONGO_DB_URL is missing from backend/.env')
    await mongoose.connect(process.env.MONGO_DB_URL)
    console.log(`MongoDB connected: ${mongoose.connection.name}`)

    app.listen(PORT, () => {
      console.log(`API running on ${BASE}`)
      for (const [name, path] of Object.entries(ENDPOINTS)) {
        if (!path.startsWith('POST')) console.log(`  ${name.padEnd(10)} ${BASE}${path}`)
      }
    })
  } catch (err) {
    console.error('Could not start the server:', err.message)
    process.exit(1)
  }
}

start()
