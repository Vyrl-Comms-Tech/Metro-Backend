const mongoose = require("mongoose");
const { variantTitle } = require("../utils/title");
const { slugify } = require("../utils/slug");


const DIAMOND_CATEGORIES = ["loose-diamond", "diamonds"];

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    slug: { type: String, trim: true, index: true },
    type: { type: String, enum: ["Lab Grown", "Natural"] },
    carat: { type: Number, min: 0 },
    metal: { type: String, required: function () { return !DIAMOND_CATEGORIES.includes(this.parent()?.mainCategory) }, trim: true },
    metalCode: { type: String, trim: true, uppercase: true },
    productCode: { type: String, required: true, trim: true },
    price: { type: Number, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    description: { type: String, trim: true },
    details: { type: Map, of: String },
    images: [{ type: String }],
    sourceUrl: { type: String, trim: true },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mainCategory: { type: String, required: true, index: true },
    subCategory: { type: String, trim: true, index: true },
    category: { type: String, trim: true, index: true },
    description: { type: String, trim: true },

    gemstone: { type: String, trim: true },
    shape: { type: String, trim: true },
    width: { type: Number, min: 0 },
    carat: { type: Number, min: 0 },

    color: { type: String, trim: true, uppercase: true },
    clarity: { type: String, trim: true, uppercase: true },
    cut: { type: String, trim: true },
    certificate: { type: String, trim: true },

    gender: { type: String, enum: ["Male", "Female"], index: true },
    ringCovering: { type: String, trim: true },
    style: { type: String, trim: true, index: true },

    pendantType: { type: String, trim: true, index: true },

    variants: [variantSchema],
    sourceUrl: { type: String, trim: true },
  },
  { timestamps: true },
);

productSchema.pre("validate", function () {
  for (const v of this.variants) {
    if (!v.name && this.name)
      v.name = variantTitle(this.name, {
        carat: v.carat ?? this.carat,
        type: v.type,
        metal: v.metal,
      });
    if (!v.name) continue;
    const slug = slugify(v.name);
    if (!v.slug?.startsWith(slug)) v.slug = slug;
  }
  this.name ||= this.variants[0]?.name;
});

productSchema.set("toJSON", {
  virtuals: true,
  flattenMaps: true,
  transform: (doc, ret) => {
    ret.variants = ret.variants?.map((v) => ({
      ...v,
      name: v.name || variantTitle(ret.name, v),
    }));
    return ret;
  },
});

const first = (doc, key) => doc.variants?.[0]?.[key];
for (const key of ["type", "metal", "price", "compareAtPrice"]) {
  productSchema.virtual(key).get(function () {
    return first(this, key);
  });
}
productSchema.virtual("images").get(function () {
  return first(this, "images") ?? [];
});

module.exports = mongoose.model("Product", productSchema);
