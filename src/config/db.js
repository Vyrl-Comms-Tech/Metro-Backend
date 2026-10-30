const mongoose = require('mongoose')

// responses include `id` next to `_id`, which is what the dashboard uses
mongoose.set('toJSON', { virtuals: true })

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URL)
  console.log(`MongoDB connected: ${mongoose.connection.name}`)
}

module.exports = connectDB
