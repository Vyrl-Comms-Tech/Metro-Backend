const mongoose = require('mongoose')
const { variantTitle } = require('../utils/title')
const { slugify } = require('../utils/slug')

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true }, // the full name of this variation, e.g. "2ct Lab-Grown Diamond Tennis Bracelet White Gold"
    slug: { type: String, trim: true, index: true }, // made from the name, for links and lookups
    type: { type: String, enum: ['Lab Grown', 'Natural'] }, // earrings come in both
    carat: { type: Number, min: 0 }, // bracelets: one product, one variant per carat weight
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
    style: { type: String, trim: true, index: true }, // wedding rings: Channel / Pavé / Micropavé setting

    // necklaces
    pendantType: { type: String, trim: true, index: true }, // Crosses, Evil Eyes, Hearts...

    variants: [variantSchema],
    sourceUrl: { type: String, trim: true },
  },
  { timestamps: true },
)

// every variation has its own name and a slug made from it; the product takes the first variation's name
productSchema.pre('validate', function () {
  for (const v of this.variants) {
    if (!v.name && this.name) v.name = variantTitle(this.name, { carat: v.carat ?? this.carat, type: v.type, metal: v.metal })
    if (!v.name) continue
    const slug = slugify(v.name)
    if (!v.slug?.startsWith(slug)) v.slug = slug // a slug that only adds a suffix to keep it unique stays
  }
  this.name ||= this.variants[0]?.name
})

// every variation is sent with its stored name, e.g. "2ct Lab-Grown Diamond Tennis Bracelet White Gold"
// (the product's own `name` stays the base name "Diamond Tennis Bracelet", which is what the dashboard edits)
productSchema.set('toJSON', {
  virtuals: true,
  flattenMaps: true,
  transform: (doc, ret) => {
    ret.variants = ret.variants?.map((v) => ({ ...v, name: v.name || variantTitle(ret.name, v) }))
    return ret
  },
})

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
