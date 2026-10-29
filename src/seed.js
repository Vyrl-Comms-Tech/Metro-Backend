// Fills the database with starting content (collections, FAQs, reels, site text).
//   pnpm seed   replaces categories, FAQs, reels and site content; products are untouched
const { readFileSync } = require('node:fs')
const path = require('node:path')
const mongoose = require('mongoose')
const { mongoUrl } = require('./config/env.js')
const { uploadToR2 } = require('./utils/r2.js')
const { CATEGORIES } = require('./seedData/categories.js')
const { FAQ_CATEGORIES } = require('./seedData/faqs.js')
const { REELS } = require('./seedData/reels.js')
const { SITE_CONTENT } = require('./seedData/content.js')
const Category = require('./models/Category.js')
const Content = require('./models/Content.js')
const Faq = require('./models/Faq.js')
const Product = require('./models/Product.js')
const Reel = require('./models/Reel.js')

const PUBLIC_DIR = path.join(__dirname, '../../public')

// card images ship with the website; upload them to R2 and store the public URL
const stockImage = async (name) => {
  if (!name) return undefined
  const ext = path.extname(name).slice(1).toLowerCase().replace('jpg', 'jpeg')
  return uploadToR2({
    originalname: name,
    mimetype: `image/${ext}`,
    buffer: readFileSync(path.join(PUBLIC_DIR, name)),
  })
}

async function seed() {
  await mongoose.connect(mongoUrl)

  await Category.deleteMany({})
  await Category.insertMany(
    await Promise.all(CATEGORIES.map(async (c, i) => ({ ...c, image: await stockImage(c.image), order: i }))),
  )

  await Faq.deleteMany({})
  await Faq.insertMany(
    FAQ_CATEGORIES.flatMap((cat) =>
      cat.items.map((item, i) => ({
        category: cat.title,
        question: item.q,
        answer: item.a,
        featured: Boolean(item.featured),
        order: i,
      })),
    ),
  )

  await Reel.deleteMany({})
  await Reel.insertMany(
    REELS.map(({ name, tags, href, video, poster, tint }, i) => ({ name, tags, href, video, poster, tint, order: i })),
  )

  await Content.findOneAndUpdate({ key: 'site' }, { data: SITE_CONTENT }, { upsert: true })

  const counts = await Promise.all(
    [Category, Faq, Reel, Product].map(async (M) => `${M.modelName}: ${await M.countDocuments()}`),
  )
  console.log('Seeded ->', counts.join(', '))
  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
