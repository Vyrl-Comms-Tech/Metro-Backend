// Saves each wedding ring's setting style (Channel / Pavé / Micropavé) on the products already in the database.
//   node scripts/setRingStyles.js [--dry]
// The style comes from scripts/output/wedding-rings.json, matched by the product code of the ring's variations.
require('dotenv').config({ quiet: true })
const { readFileSync } = require('node:fs')
const path = require('node:path')
const mongoose = require('mongoose')
const Product = require('../src/models/Product.js')

const dry = process.argv.includes('--dry')
const rings = JSON.parse(readFileSync(path.join(__dirname, 'output/wedding-rings.json'), 'utf8'))

async function main() {
  await mongoose.connect(process.env.MONGODB_URL)
  const counts = {}
  let updated = 0
  for (const ring of rings) {
    const style = ring.filters?.style?.[0]
    const code = ring.variants?.[0]?.productCode
    if (!style || !code) continue
    counts[style] = (counts[style] ?? 0) + 1
    if (!dry) updated += (await Product.updateOne({ 'variants.productCode': code }, { $set: { style } })).modifiedCount
  }
  console.log(`styles found: ${JSON.stringify(counts)}${dry ? ' (dry run, nothing saved)' : `, products updated: ${updated}`}`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
