// Scrapes a public Shopify collection with Playwright into a local JSON file for review.
//   node scripts/scrapeCollection.js [collection-handle] [collection-slug] [--limit=N]
//   --limit=20  scrape only the first 20 products (run again with a bigger number to continue)
//   node scripts/scrapeCollection.js wedding-rings wedding-rings
// Output: scripts/output/<handle>.json  (nothing is written to the database or R2)
// Earrings have a stone-type and a metal option on separate pages: use scrapeEarrings.js for those.
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const path = require('node:path')
const { SITE, DELAY_MS, SAVE_EVERY, sleep, parseArgs, launch, collectLinks, collectFacets, readDetails, productFields } = require('./lib/scraper')

const { handle, slug, limit } = parseArgs('wedding-rings')

async function scrapeProduct(page, href) {
  await page.goto(`${SITE}${href}`, { waitUntil: 'domcontentloaded' })
  const ld = await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => x.textContent))
  const product = ld
    .map((raw) => {
      try { return JSON.parse(raw) } catch { return null }
    })
    .find((d) => d && ['ProductGroup', 'Product'].includes(d['@type']))
  if (!product) throw new Error('no product data on page')

  // the full gallery (every angle of every metal) comes from the product's own .js data
  const media = await page.evaluate(async (url) => (await (await fetch(url)).json()).media, `${href}.js`)
  const metalNames = (await page.$$eval('button[data-value][data-sku]', (b) => b.map((x) => x.dataset.value))).map((m) =>
    m.toLowerCase(),
  )
  const imagesByMetal = {}
  for (const m of media.filter((m) => m.media_type === 'image').sort((a, b) => a.position - b.position)) {
    // alt text is the metal name on rings; on other products it is a file name, so keep those together
    const key = metalNames.includes(String(m.alt).toLowerCase()) ? m.alt : 'default'
    ;(imagesByMetal[key] ||= []).push(m.src)
  }
  const images = Object.entries(imagesByMetal).find(([k]) => k !== 'default')?.[1] || imagesByMetal.default || [] // first metal, all angles

  const { fields, productCode } = await readDetails(page)

  // every metal option has its own code, price and details (weight changes too), so click through them
  const options = await page.$$eval('button[data-value][data-sku]', (buttons) =>
    buttons.map((b) => ({ metal: b.dataset.value, sku: b.dataset.sku, price: b.dataset.price })),
  )
  const variants = []
  for (const [i, option] of options.entries()) {
    await page.locator('button[data-value][data-sku]').nth(i).evaluate((b) => b.click())
    await page.waitForFunction((sku) => document.body.innerText.includes(sku), option.sku, { timeout: 3000 }).catch(() => {})
    const detail = await readDetails(page)
    variants.push({
      metal: option.metal,
      metalCode: option.sku.split('-').pop(), // WG, YG, RG, PL
      productCode: option.sku,
      price: Number(option.price.replace(/,/g, '')) || undefined, // AED
      details: detail.fields,
    })
  }
  return {
    name: product.name,
    collectionSlug: slug,
    category: product.category || undefined,
    ...productFields(fields),
    productCode: variants[0]?.productCode ?? productCode,
    price: variants[0]?.price, // AED, for the first metal
    variants, // one entry per metal: { metal, metalCode, productCode, price, details }
    details: fields, // every "Label: value" line from the product details block
    description: product.description,
    images, // source URLs only, not re-hosted
    imagesByMetal, // { "18K White Gold": [angle1, angle2, ...], ... }
    sourceUrl: `${SITE}${href}`,
  }
}

async function main() {
  const dir = path.join(__dirname, 'output')
  mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${handle}.json`)

  // resume: keep what an earlier (stopped) run already saved
  // (products saved by an older version, without `variants`, are scraped again)
  const products = (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : []).filter((p) => p.variants)
  const done = new Set(products.map((p) => p.sourceUrl))
  const save = () => writeFileSync(file, JSON.stringify(products, null, 2))
  if (products.length) console.log(`Resuming: ${products.length} products already saved`)

  const { browser, page } = await launch()

  // Ctrl+C saves progress before exiting
  process.on('SIGINT', () => {
    save()
    console.log(`
Stopped. Saved ${products.length} products -> ${file}`)
    process.exit(0)
  })

  try {
    const links = await collectLinks(page, handle, limit)
    console.log(`Found ${links.length} products`)

    for (const [i, href] of links.entries()) {
      if (done.has(`${SITE}${href}`)) continue
      try {
        products.push(await scrapeProduct(page, href))
        console.log(`[${i + 1}/${links.length}] ${products.at(-1).name}`)
        if (products.length % SAVE_EVERY === 0) save()
      } catch (err) {
        console.error(`[${i + 1}/${links.length}] ${href} skipped: ${err.message}`)
      }
      await sleep(DELAY_MS)
    }

    // collection-page filters (gender, plain/diamond, ring style...) for every product, including resumed ones
    const facets = await collectFacets(page, handle)
    for (const p of products) p.filters = facets[new URL(p.sourceUrl).pathname] || {}

    save()
    console.log(`Saved ${products.length} products -> ${file}`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
