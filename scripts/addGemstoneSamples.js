// Adds sample gemstones, each with a few random gemstone photos (Pexels links, nothing is uploaded), to the Gemstone category,
// to test the Gemstone page and the product page.
//   node scripts/addGemstoneSamples.js [--dry]
// Needs the Gemstone main category (Admin > Categories). A stone whose product code is already saved is not added
// again, only its photos are replaced. Remove the samples afterwards from Admin > Products.
require('dotenv').config({ quiet: true })
const mongoose = require('mongoose')
const Category = require('../src/models/Category.js')
const Product = require('../src/models/Product.js')

const dry = process.argv.includes('--dry')

// gemstone, shape, carat, type, colour, clarity, origin, treatment, dimensions (mm), price (AED)
const STONES = [
  ['Blue Sapphire', 'Oval', 2.45, 'Natural', 'Royal Blue', 'VS', 'Sri Lanka', 'Heated', '9.1 x 7.2 x 4.9', 4500],
  ['Emerald', 'Emerald', 3.02, 'Natural', 'Vivid Green', 'SI', 'Colombia', 'Minor oil', '10.2 x 8.1 x 5.6', 9800],
  ['Ruby', 'Round', 1.86, 'Natural', 'Pigeon Blood Red', 'VS', 'Mozambique', 'Heated', '7.6 x 7.6 x 4.4', 7200],
  ['Tanzanite', 'Pear', 2.74, 'Natural', 'Violet Blue', 'VVS', 'Tanzania', 'Heated', '10.4 x 7.3 x 5.1', 5400],
  ['Pink Sapphire', 'Cushion', 1.62, 'Lab Grown', 'Vivid Pink', 'VVS', 'Lab created', 'None', '6.9 x 6.7 x 4.2', 1900],
  ['Yellow Sapphire', 'Oval', 3.4, 'Natural', 'Canary Yellow', 'VS', 'Sri Lanka', 'Heated', '10.6 x 8.2 x 5.3', 3600],
  ['Green Sapphire', 'Emerald', 2.1, 'Natural', 'Teal Green', 'SI', 'Australia', 'Untreated', '8.8 x 6.9 x 4.7', 2800],
  ['Red Garnet', 'Round', 1.5, 'Natural', 'Deep Red', 'Eye clean', 'Tanzania', 'Untreated', '7.1 x 7.1 x 4.3', 900],
  ['Blue Beryl', 'Pear', 4.2, 'Natural', 'Aqua Blue', 'Eye clean', 'Brazil', 'Heated', '13.0 x 9.1 x 6.2', 3100],
  ['Red Spinel', 'Cushion', 1.95, 'Natural', 'Hot Red', 'VS', 'Myanmar', 'Untreated', '7.3 x 7.0 x 4.6', 6600],
]

const code = (gemstone, i) =>
  `GS-${gemstone.split(' ').map((w) => w[0]).join('')}-${String(i + 1).padStart(2, '0')}`

// gemstone photos from Pexels, each stone gets a few of them picked at random
const PHOTO_IDS = [13513581, 4040640, 13307186, 37942964, 37942957, 37942960, 6766259, 33203193, 15081674, 6144298]
const PHOTOS = PHOTO_IDS.map((id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`)
const shuffle = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v)
const PHOTOS_PER_STONE = 3

function build([gemstone, shape, carat, type, colour, clarity, origin, treatment, dimensions, price], i, mainCategory, photos) {
  const name = `${type} ${gemstone} - ${carat} Carat ${shape} Cut`
  const details = { colour, clarity, origin, treatment, dimensions }
  return {
    name,
    mainCategory,
    gemstone,
    shape,
    carat,
    variants: [
      {
        name,
        type,
        metal: 'Loose Stone', // required by the schema; hidden for stones on the website
        productCode: code(gemstone, i),
        price,
        details,
        description: Object.entries(details)
          .map(([key, value]) => `${key[0].toUpperCase()}${key.slice(1)}: ${value}`)
          .join('\n'),
        images: shuffle(photos).slice(0, PHOTOS_PER_STONE),
      },
    ],
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URL)
  const category = await Category.findOne({ slug: /^gemstones?$/ })
  if (!category) throw new Error('No Gemstone main category found. Add it in Admin > Categories first.')

  let added = 0
  let updated = 0
  for (const [i, row] of STONES.entries()) {
    const product = build(row, i, category.slug, PHOTOS)
    const productCode = product.variants[0].productCode
    const existing = await Product.findOne({ 'variants.productCode': productCode })
    if (existing) {
      // already saved: give it a fresh set of photos
      console.log(`${dry ? 'would update' : 'update'}  ${productCode}  photos`)
      if (!dry) {
        existing.variants[0].images = product.variants[0].images
        await existing.save()
      }
      updated++
      continue
    }
    console.log(`${dry ? 'would add' : 'add'}  ${productCode}  ${product.name}`)
    if (!dry) await Product.create(product)
    added++
  }
  console.log(`${dry ? 'would add' : 'added'} ${added}, ${dry ? 'would update' : 'updated'} ${updated} (of ${STONES.length} stones) in "${category.slug}"`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
