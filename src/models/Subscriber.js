const mongoose = require('mongoose')

// an email address signed up through the website footer's newsletter form
const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 200, match: [/^\S+@\S+\.\S+$/, 'Enter a valid email'] },
  },
  { timestamps: true },
)

subscriberSchema.index({ createdAt: -1 })

module.exports = mongoose.model('Subscriber', subscriberSchema)
