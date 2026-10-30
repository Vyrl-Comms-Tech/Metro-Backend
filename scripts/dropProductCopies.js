// One-off clean-up: products used to store copies of their first variant (type, metal, price, compareAtPrice,
// images) and of what they come in (types, metals). They are now read from the variants instead.
//   node scripts/dropProductCopies.js --dry    only report what would change
//   node scripts/dropProductCopies.js          do it
// Safe to run again. First it makes sure every variant carries the diamond type (a ring stored it only on the
// product), then it removes the seven copies. Nothing else is touched.
require('dotenv').config()
const mongoose = require('mongoose')

const COPIES = ['type', 'metal', 'price', 'compareAtPrice', 'images', 'types', 'metals']
const dry = process.argv.includes('--dry')

async function main() {
  await mongoose.connect(process.env.MONGODB_URL)
  try {
    const products = mongoose.connection.collection('products')
    const docs = await products.find({}, { projection: { type: 1, variants: 1 } }).toArray()

    let typed = 0
    const ops = []
    for (const p of docs) {
      const variants = p.variants || []
      // a variant without a type takes the product's (wedding rings: one stone type for all their metals)
      if (p.type && variants.some((v) => !v.type)) {
        typed++
        ops.push({
          updateOne: {
            filter: { _id: p._id },
            update: { $set: { variants: variants.map((v) => ({ ...v, type: v.type || p.type })) } },
          },
        })
      }
    }

    const withCopies = await products.countDocuments({ $or: COPIES.map((k) => ({ [k]: { $exists: true } })) })
    console.log(`${docs.length} products | ${typed} need the diamond type copied onto their variants | ${withCopies} still carry the copies`)
    if (dry) return

    if (ops.length) await products.bulkWrite(ops)
    const unset = Object.fromEntries(COPIES.map((k) => [k, '']))
    const res = await products.updateMany({}, { $unset: unset })
    console.log(`Done: variants typed on ${typed} products, copies removed from ${res.modifiedCount} products`)
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
