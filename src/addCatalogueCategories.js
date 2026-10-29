// Add the requested collections to an existing database without resetting other content.
const mongoose = require('mongoose')
const { mongoUrl } = require('./config/env')
const Category = require('./models/Category')

const requested = [
  {
    title: 'Loose Diamond',
    slug: 'loose-diamond',
    subCategories: ['Natural Diamond', 'Lab Grown Diamond'],
    description: 'Explore natural and lab grown loose diamonds',
  },
  {
    title: 'Diamonds',
    slug: 'diamonds',
    subCategories: ['Natural Diamond', 'Lab Grown Diamond'],
    description: 'Discover natural and lab grown diamonds',
  },
]

async function main() {
  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 5000 })
  try {
    const last = await Category.findOne().sort({ order: -1 }).select('order').lean()
    let nextOrder = (last?.order ?? -1) + 1

    for (const category of requested) {
      await Category.updateOne(
        { slug: category.slug },
        {
          $set: { title: category.title, subCategories: category.subCategories, description: category.description },
          $setOnInsert: { slug: category.slug, order: nextOrder++, showOnHome: true },
        },
        { upsert: true },
      )
    }

    await Category.updateOne(
      { slug: 'jewellery' },
      {
        $set: { subCategories: ['Rings', 'Earrings', 'Necklaces', 'Bracelets', 'Exclusive Pieces'] },
        $setOnInsert: { title: 'Jewellery', slug: 'jewellery', order: nextOrder, showOnHome: true },
      },
      { upsert: true },
    )
    console.log('Catalogue categories updated')
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
