// Add the requested collections to an existing database without resetting other content.
require('dotenv').config()
const mongoose = require('mongoose')
const Category = require('./models/Category')
const { JEWELLERY_TREE } = require('./seedData/categories')

const requested = [
  {
    title: 'Loose Diamond',
    slug: 'loose-diamond',
    subCategories: [{ title: 'Natural Diamond' }, { title: 'Lab Grown Diamond' }],
    description: 'Explore natural and lab grown loose diamonds',
  },
  {
    title: 'Diamonds',
    slug: 'diamonds',
    subCategories: [{ title: 'Natural Diamond' }, { title: 'Lab Grown Diamond' }],
    description: 'Discover natural and lab grown diamonds',
  },
]

async function main() {
  await mongoose.connect(process.env.MONGODB_URL, { serverSelectionTimeoutMS: 5000 })
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
        $set: { subCategories: JEWELLERY_TREE },
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
