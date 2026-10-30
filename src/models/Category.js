const mongoose = require('mongoose')

const subCategorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    options: [{ type: String, trim: true }], 
  },
  { _id: false },
)

const categorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    subCategories: [subCategorySchema],
    image: { type: String },
    banner: { type: String },
    description: { type: String, trim: true }, 
    tag: { type: String, trim: true },
    showOnHome: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Category', categorySchema)
