const mongoose = require('mongoose')


const goldPriceSchema = new mongoose.Schema({
  hour: { type: Date, required: true, unique: true }, 
  usd: { type: Number, required: true }, 
})

module.exports = mongoose.model('GoldPrice', goldPriceSchema)
