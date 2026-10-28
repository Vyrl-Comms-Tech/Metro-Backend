const mongoose = require('mongoose')

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    collectionSlug: { type: String, required: true, index: true }, // e.g. "earrings"
    category: { type: String, trim: true },
    type: { type: String, enum: ['Lab Grown', 'Natural'] },
    metal: { type: String, trim: true },
    gemstone: { type: String, trim: true },
    shape: { type: String, trim: true },
    width: { type: Number, min: 0 },
    carat: { type: Number, min: 0 },
    description: { type: String, trim: true },
    images: [{ type: String }], // image URLs; the first one is the main photo
  },
  { timestamps: true },
)

module.exports = mongoose.model('Product', productSchema)
