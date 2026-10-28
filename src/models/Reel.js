const mongoose = require('mongoose')

const reelSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    href: { type: String, required: true, trim: true }, // Instagram link
    video: { type: String, trim: true }, // vertical mp4 URL
    poster: { type: String, trim: true }, // still image URL
    tint: [{ type: String }], // placeholder gradient colours
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Reel', reelSchema)
