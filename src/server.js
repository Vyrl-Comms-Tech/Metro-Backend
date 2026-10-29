const cors = require('cors')
const express = require('express')
const routes = require('./routes')
const connectDB = require('./config/db')
const { port, corsOrigins } = require('./config/env')
const { recordPrice, backfillHistory } = require('./services/goldService')
const { notFound, errorHandler } = require('./middleware/errorHandler')

const app = express()

app.use(cors({ origin: corsOrigins }))
app.use(express.json())

app.use('/api', routes)
app.use('/', routes)

app.use(notFound)
app.use(errorHandler)

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`API running on http://localhost:${port}`))

    // keep the gold price history growing even when nobody opens the site
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
