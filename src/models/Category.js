const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    subCategories: [{ type: String, trim: true }],
    banner: { type: String }, // collection page banner image
    description: { type: String, trim: true }, // short line on the home page card
    tag: { type: String, trim: true }, // small badge on the card, e.g. "New In"
    image: { type: String }, // home page card image
    showOnHome: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Category', categorySchema)
