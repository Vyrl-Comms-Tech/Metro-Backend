require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const express = require('express')
const routes = require('./routes')
const connectDB = require('./config/db')
const { recordPrice, backfillHistory } = require('./services/goldService')
const { apiLimiter } = require('./middleware/rateLimit')
const { notFound, errorHandler } = require('./middleware/errorHandler')

const PORT = process.env.PORT || 5000
const CORS_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173' || 'http://localhost:5174').split(',').map((url) => url.trim())

const app = express()

if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY)

app.use(cors({ origin: CORS_ORIGINS, credentials: true }))
app.use(cookieParser())
app.use(express.json())
app.use(apiLimiter)

app.use('/', routes)

app.use(notFound)
app.use(errorHandler)

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`))
    const record = () => recordPrice().catch((err) => console.error('Gold price snapshot failed:', err.message))
    record()
    setInterval(record, 60 * 60 * 1000)

    const backfill = (force) =>
      backfillHistory({ force })
        .then((n) => n && console.log(`Gold price history: ${n} days loaded`))
        .catch((err) => console.error('Gold price backfill failed:', err.message))
    backfill(false)
    setInterval(() => backfill(true), 24 * 60 * 60 * 1000)
  })
  .catch((err) => {
    console.error('Could not start the server:', err.message)
    process.exit(1)
  })
