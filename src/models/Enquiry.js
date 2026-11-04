const mongoose = require('mongoose')

// a message sent from the website's Contact Us form
const enquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200, match: [/^\S+@\S+\.\S+$/, 'Enter a valid email'] },
    phone: { type: String, trim: true, maxlength: 40 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    read: { type: Boolean, default: false, index: true }, 
  },
  { timestamps: true },
)

enquirySchema.index({ createdAt: -1 })

module.exports = mongoose.model('Enquiry', enquirySchema)
