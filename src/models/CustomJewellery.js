const mongoose = require('mongoose')

const customJewellerySchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    image: { type: String, trim: true }, // image URL
    video: { type: String, trim: true }, // video URL (shown with the image as its poster)
    active: { type: Boolean, default: true }, // inactive items are hidden on the website
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
)

customJewellerySchema.pre('validate', function () {
  if (!this.image && !this.video) this.invalidate('image', 'Upload an image or a video')
})

module.exports = mongoose.model('CustomJewellery', customJewellerySchema)
