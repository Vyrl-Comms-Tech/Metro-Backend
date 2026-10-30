const mongoose = require('mongoose')

const variantSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Lab Grown', 'Natural'] }, // earrings come in both
    metal: { type: String, required: true, trim: true }, // "18k White Gold"
    metalCode: { type: String, trim: true, uppercase: true }, // WG, YG, RG, PL
    productCode: { type: String, required: true, trim: true },
    price: { type: Number, min: 0 }, // AED
    compareAtPrice: { type: Number, min: 0 }, // AED, the struck-through price when on sale
    details: { type: Map, of: String }, // every "label: value" line, weight and stone grade included
    images: [{ type: String }],
    sourceUrl: { type: String, trim: true },
  },
  { _id: false },
)

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mainCategory: { type: String, required: true, index: true },
    subCategory: { type: String, trim: true, index: true },
    category: { type: String, trim: true, index: true },
    description: { type: String, trim: true },

    gemstone: { type: String, trim: true },
    shape: { type: String, trim: true }, // stone shape: Round, Oval, Pear...
    width: { type: Number, min: 0 },
    carat: { type: Number, min: 0 },

    // wedding rings
    gender: { type: String, enum: ['Male', 'Female'], index: true },
    ringCovering: { type: String, trim: true }, // Half / 3/4 / Full Eternity

    // necklaces
    pendantType: { type: String, trim: true, index: true }, // Crosses, Evil Eyes, Hearts...

    variants: [variantSchema],
    sourceUrl: { type: String, trim: true },
  },
  { timestamps: true },
)

const first = (doc, key) => doc.variants?.[0]?.[key]
for (const key of ['type', 'metal', 'price', 'compareAtPrice']) {
  productSchema.virtual(key).get(function () {
    return first(this, key)
  })
}
productSchema.virtual('images').get(function () {
  return first(this, 'images') ?? []
})

module.exports = mongoose.model('Product', productSchema)
