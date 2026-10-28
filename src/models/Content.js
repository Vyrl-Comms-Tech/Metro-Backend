const mongoose = require('mongoose')

// one document ("site") holding the editable website text, contact details, hours etc.
const contentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Content', contentSchema)
