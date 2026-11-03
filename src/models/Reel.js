const mongoose = require('mongoose')

const reelSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    href: { type: String, trim: true }, // Instagram link (optional when the reel is a video link)
    video: { type: String, trim: true }, // vertical mp4 URL
    poster: { type: String, trim: true }, // still image URL
    active: { type: Boolean, default: true }, // inactive reels are hidden on the website
    tint: [{ type: String }], // placeholder gradient colours
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Reel', reelSchema)
