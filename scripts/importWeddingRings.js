require('dotenv').config()
const { readFileSync } = require('node:fs')
const path = require('node:path')
const mongoose = require('mongoose')
const Product = require('../src/models/Product.js')
const { checkCategoryPath } = require('../src/utils/categoryPath.js')

// scraped collection -> where it sits in the shop (Jewellery > subcategory); titles match the Categories page
const SUB_CATEGORIES = { earrings: 'Earrings', bracelets: 'Bracelets', necklaces: 'Necklaces', 'wedding-rings': 'Rings' }

// the site words gemstones freely ("red rubies", "sri lankan pink sapphires"); store the names the admin dropdown offers
const GEMSTONES = ['Black Diamond', 'Pink Diamond', 'Yellow Diamond', 'Pink Sapphire', 'Blue Sapphire', 'Yellow Sapphire', 'Green Sapphire', 'Rainbow Sapphire', 'Red Garnet', 'Blue Beryl', 'Red Spinel', 'Tanzanite', 'Emerald', 'Ruby', 'Diamond']
const cleanGemstone = (text) => {
  const t = (text || '').toLowerCase()
  const key = t.includes('rubies') ? 'ruby' : t
  return GEMSTONES.find((g) => key.includes(g.toLowerCase())) || text
}

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const file = args.find((a) => !a.startsWith('--')) || path.join(__dirname, 'output/wedding-rings.json')


const cleanDetails = (details = {}) =>
  Object.fromEntries(Object.entries(details).map(([k, v]) => [k.replace(/\./g, ''), v]))

const toProduct = (p) => {
  const imagesByMetal = Object.fromEntries(
    Object.entries(p.imagesByMetal || {}).map(([metal, urls]) => [metal.toLowerCase(), urls]),
  )
  return {
    name: p.name,
    mainCategory: 'jewellery',
    subCategory: SUB_CATEGORIES[p.collectionSlug],
    category: p.filters?.shape?.[0] || p.category, // rings: Plain / Diamond (the scraped "Rings" is only the product type); earrings: Diamond Hoops...
    sourceUrl: p.sourceUrl,
    gemstone: cleanGemstone(p.gemstone),
    shape: p.shape,
    width: p.width,
    carat: p.carat,
    description: p.description,
    gender: p.filters?.gender?.[0],
    ringCovering: p.filters?.ring_sizing?.[0],
    pendantType: p.pendantType, // necklaces
    variants: (p.variants || []).map((v) => ({
      type: v.type ?? p.type, // earrings carry it on each variant; a ring has one stone type for all its metals
      metal: v.metal,
      metalCode: v.metalCode,
      productCode: v.productCode,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      details: cleanDetails(v.details),
      images: v.images || imagesByMetal[v.metal.toLowerCase()] || [], // earrings carry images on the variant, rings in imagesByMetal
      sourceUrl: v.sourceUrl,
    })),
  }
}

async function main() {
  const products = JSON.parse(readFileSync(file, 'utf8')).map(toProduct)
  const noImages = products.reduce((n, p) => n + p.variants.filter((v) => !v.images.length).length, 0)
  console.log(`Mapped ${products.length} products (${noImages} variants without images)`)

  if (dry) {
    console.log(JSON.stringify(products[0], null, 2))
    return
  }

  await mongoose.connect(process.env.MONGODB_URL)
  try {
    const unknown = products.find((p) => !p.subCategory)
    if (unknown) throw new Error(`No subcategory known for "${unknown.name}" - add its collection to SUB_CATEGORIES`)
    // every subcategory / category pair must exist on the Categories page (run: node src/addCatalogueCategories.js)
    const paths = new Map(products.map((p) => [`${p.subCategory}|${p.category}`, p]))
    for (const p of paths.values()) await checkCategoryPath(p)

    // replaces this subcategory's products, including rings saved earlier under the old collectionSlug field
    const subs = [...new Set(products.map((p) => p.subCategory))]
    const old = Object.keys(SUB_CATEGORIES).filter((k) => subs.includes(SUB_CATEGORIES[k]))
    // rings saved before the rename have collectionSlug instead of mainCategory, so that one is deleted on the raw collection
    const removed = await Product.deleteMany({ mainCategory: 'jewellery', subCategory: { $in: subs } })
    const legacy = await Product.collection.deleteMany({ collectionSlug: { $in: old } })
    removed.deletedCount += legacy.deletedCount
    await Product.insertMany(products)
    console.log(`Replaced ${removed.deletedCount} existing -> inserted ${products.length} products in Jewellery > ${subs.join(', ')}`)
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
