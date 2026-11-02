// Saves the full name and slug on every variation of one sub category.
//   node scripts/setVariantNames.js Bracelets bracelets --dry
// The name is the site's own title from scripts/output/<collection>.pages.json (matched by product code);
// a variation the file doesn't cover gets the generated name instead.
// A variation with no diamond type gets one too: from its title ("Lab-Grown" / "Natural"), else the scraped type.
require('dotenv').config()
const { readFileSync } = require('node:fs')
const path = require('node:path')
const mongoose = require('mongoose')
const Product = require('../src/models/Product.js')
const { slugify } = require('../src/utils/slug.js')
const { variantTitle } = require('../src/utils/title.js')

const [subCategory, collection] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const dry = process.argv.includes('--dry')
if (!subCategory || !collection) throw new Error('usage: node scripts/setVariantNames.js <SubCategory> <collection> [--dry]')

const pages = JSON.parse(readFileSync(path.join(__dirname, `output/${collection}.pages.json`), 'utf8'))
const pageByCode = new Map(pages.map((p) => [p.productCode, p]))
const typeOf = (page) => (/lab-grown/i.test(page.title) ? 'Lab Grown' : /natural/i.test(page.title) ? 'Natural' : page.type)

async function main() {
  await mongoose.connect(process.env.MONGODB_URL)

  // slugs already used by the other sub categories, so a new one never repeats
  const used = new Set(
    (await Product.distinct('variants.slug', { subCategory: { $ne: subCategory } })).filter(Boolean),
  )
  const products = await Product.find({ subCategory })
  let fromSite = 0
  let typesFilled = 0
  const generated = []
  const renamed = []

  for (const product of products) {
    for (const v of product.variants) {
      const page = pageByCode.get(v.productCode)
      const siteTitle = page?.title
      const name = siteTitle ?? variantTitle(product.name, { carat: v.carat ?? product.carat, type: v.type, metal: v.metal })
      if (siteTitle) fromSite++
      else generated.push(`${v.productCode}  ${name}`)

      let slug = slugify(name)
      if (used.has(slug)) slug = slugify(`${name} ${v.productCode}`)
      used.add(slug)

      if (!v.type && page && typeOf(page)) {
        v.type = typeOf(page)
        typesFilled++
      }
      if (v.name && v.name !== name) renamed.push(`${v.name}  ->  ${name}`)
      v.name = name
      v.slug = slug
    }
    if (!dry) await product.save()
  }

  const total = products.reduce((n, p) => n + p.variants.length, 0)
  console.log(`${subCategory}: ${products.length} products, ${total} variations${dry ? ' (dry run, nothing saved)' : ' saved'}`)
  console.log(`names from the site: ${fromSite}, generated: ${generated.length}, diamond types filled in: ${typesFilled}`)
  if (generated.length) console.log('generated:\n  ' + generated.slice(0, 20).join('\n  '))
  if (renamed.length) console.log('changed:\n  ' + renamed.slice(0, 20).join('\n  '))
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
