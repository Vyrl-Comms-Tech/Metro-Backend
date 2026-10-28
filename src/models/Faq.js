const mongoose = require('mongoose')

const faqSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, index: true }, // e.g. "diamonds"
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    featured: { type: Boolean, default: false }, // also shown on the home page
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Faq', faqSchema)
