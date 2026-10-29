const mongoose = require('mongoose')
const { mongoUrl } = require('./env')

async function connectDB() {
  await mongoose.connect(mongoUrl)
  console.log(`MongoDB connected: ${mongoose.connection.name}`)
}

module.exports = connectDB
