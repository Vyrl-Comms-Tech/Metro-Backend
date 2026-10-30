// Scrapes a collection where every stone type + metal is its own product page (earrings, bracelets, necklaces, rings):
//   node scripts/scrapeVariantCollection.js earrings
//   node scripts/scrapeVariantCollection.js bracelets [--limit=N]
//   node scripts/scrapeVariantCollection.js rings wedding-rings --refresh   (see scrape:rings in package.json)
// The pages of one piece are grouped into a single record with its variants.
// --categories="A|B"  only the products of these categories (the collection page's Category filter)
// --refresh           scrape every page again instead of keeping the ones already saved
// Output: scripts/output/<handle>.pages.json (one record per page) and <handle>.json (one per piece).
// Nothing is written to the database. The wedding rings (one page per ring) use scrapeCollection.js.
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const path = require('node:path')
const { SITE, DELAY_MS, SAVE_EVERY, sleep, parseArgs, launch, collectLinks, collectFacets, readDetails, productFields } = require('./lib/scraper')

const { handle, slug, limit } = parseArgs('earrings')
const refresh = process.argv.includes('--refresh')

// the rings collection holds every kind of ring; these are the categories to scrape (the wedding rings are separate)
const DEFAULT_CATEGORIES = {
  rings: ['Exclusive Engagement Rings', 'Eternity Rings', 'Gemstone Rings', 'Fashion Rings', 'Constellation Rings', 'Fancy Coloured Diamond Rings'],
}
const categoryArg = process.argv.find((a) => a.startsWith('--categories='))?.slice('--categories='.length)
const categories = categoryArg ? categoryArg.split('|') : (DEFAULT_CATEGORIES[handle] ?? [])
const categoryQuery = categories.map((c) => `&filter.p.m.custom.category=${encodeURIComponent(c)}`).join('')

const TYPES = ['Lab Grown', 'Natural']
const METALS = [['white', 'WG'], ['yellow', 'YG'], ['rose', 'RG'], ['platinum', 'PL']]
const METAL_CODES = METALS.map(([, code]) => code)
// the metal can sit anywhere in the address: ...-white-gold, or ...-yellow-gold-%D8%AE-1 on letter pieces
const METAL_IN_URL = /-(white-gold|yellow-gold|rose-gold|platinum)(?=-|$)/

// Lab Grown / Natural: the LG-/NT- code prefix, else the word in the title, else the collection's own filter, else Lab Grown
const stoneType = (p) =>
  /^NT-/.test(p.productCode) ? 'Natural'
  : /^LG-/.test(p.productCode) ? 'Lab Grown'
  : /\bnatural\b/i.test(p.title) ? 'Natural'
  : /\blab[- ]?grown\b/i.test(p.title) ? 'Lab Grown'
  : p.stoneSource ?? 'Lab Grown'

const metalRank = (metal = '') => METALS.findIndex(([word]) => metal.toLowerCase().includes(word))
const metalCode = (metal, sku = '') => METALS[metalRank(metal)]?.[1] ?? sku.match(/-(WG|YG|RG|PL)(?:-|$)/)?.[1]

const familyKey = (href) =>
  href
    .split('/')
    .pop()
    .replace(METAL_IN_URL, '')
    .split('-')
    .filter((word) => !['natural', 'lab', 'grown'].includes(word))
    .join('-')

// "Small Natural Diamond Huggie Earrings White Gold" -> "Small Diamond Huggie Earrings"
// "Natural Diamond Letter Bracelet White Gold - A" -> "Diamond Letter Bracelet - A"
const cleanName = (title) =>
  title
    .replace(/\b(lab[- ]grown|natural)\b\s*/gi, '')
    .replace(/\s*(18k\s+)?(white gold|yellow gold|rose gold|platinum)\b/i, '')
    .replace(/\s+/g, ' ')
    .trim()

async function scrapePage(page, href) {
  const res = await page.goto(`${SITE}${href}`, { waitUntil: 'domcontentloaded' })
  if (res && res.status() >= 400) throw new Error(`page returned ${res.status()}`)

  const product = await page.evaluate(async (url) => (await fetch(url)).json(), `${href}.js`)
  const { fields, productCode } = await readDetails(page)
  const sku = product.variants[0].sku
  const selectedMetal = await page.$eval('input[name="properties[Metal]"]', (el) => el.value).catch(() => undefined)
  const cartPrice = await page.evaluate(() => document.body.innerText.match(/ADD TO CART\s*\(AED\s*([\d,]+)\)/i)?.[1])
  const f = productFields(fields)

  return {
    title: product.title,
    category: product.type || undefined,
    metal: selectedMetal ?? f.metal,
    gemstone: f.gemstone,
    width: f.width,
    carat: f.carat,
    productCode: productCode ?? sku,
    price: Number((cartPrice ?? '').replace(/,/g, '')) || Math.round(product.variants[0].price / 100), // AED
    details: fields,
    images: product.media.filter((m) => m.media_type === 'image').sort((a, b) => a.position - b.position).map((m) => m.src),
    sourceUrl: `${SITE}${href}`,
  }
}

// one record per piece (earring, bracelet...); the first variant (Lab Grown, white gold) supplies the default fields
function buildEarrings(scraped) {
  // the metal selector on a few pages shows the wrong metal, the metal in the product code (WG, YG, RG, PL) never does.
  // It is the last part of most codes (LG-LBA-D-WG) but sits in the middle of ring codes (NT-ER65-RG-2.0).
  const METAL_NAMES = { WG: '18k White Gold', YG: '18k Yellow Gold', RG: '18k Rose Gold', PL: 'Platinum' }
  const codeMetal = (code) => METAL_NAMES[code.split('-').find((part) => METAL_NAMES[part])]
  // gemstone and carat are read again from the saved details, so a stone the scraper learns about later is picked up without a re-scrape
  const pages = scraped.map((p) => {
    const f = productFields(p.details || {})
    return { ...p, type: stoneType(p), metal: codeMetal(p.productCode) ?? p.metal, gemstone: p.gemstone ?? f.gemstone, carat: p.carat ?? f.carat }
  })

  // pages belong together when their addresses match once the stone type and metal are removed, or when
  // their product codes match once the LG-/NT- prefix and the metal are removed (LG-LBA-D-WG, NT-LBA-D-WG).
  // Either one alone misses some pages (a Lab Grown address may lack "diamond"), so pages are joined by either.
  const parent = pages.map((_, i) => i)
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const seen = new Map()
  pages.forEach((p, i) => {
    const codeKey = p.productCode.replace(/^(LG|NT)-/, '').split('-').filter((part) => !METAL_CODES.includes(part)).join('-')
    for (const key of [`url:${familyKey(p.sourceUrl)}`, `code:${codeKey}`]) {
      if (seen.has(key)) parent[find(i)] = find(seen.get(key))
      else seen.set(key, i)
    }
  })
  const groups = new Map()
  pages.forEach((p, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), p]))

  return [...groups.values()].map((list) => {
    const variants = [...list].sort(
      (a, b) => TYPES.indexOf(a.type) - TYPES.indexOf(b.type) || metalRank(a.metal) - metalRank(b.metal),
    )
    const d = variants[0]
    return {
      name: cleanName(d.title),
      collectionSlug: slug,
      category: d.category,
      type: d.type,
      metal: d.metal,
      gemstone: d.gemstone,
      width: d.width,
      carat: d.carat,
      productCode: d.productCode,
      price: d.price, // AED
      shape: d.shape, // stone shape, a filter on the collection page
      pendantType: d.pendantType,
      compareAtPrice: d.compareAtPrice, // AED, the struck-through price when the earring is on sale
      images: d.images, // source URLs only, not re-hosted
      types: [...new Set(variants.map((v) => v.type))],
      metals: [...new Set(variants.map((v) => v.metal))],
      variants: variants.map((v) => ({
        type: v.type,
        metal: v.metal,
        metalCode: metalCode(v.metal, v.productCode),
        productCode: v.productCode,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        details: v.details,
        images: v.images,
        sourceUrl: v.sourceUrl,
      })),
    }
  })
}

// handle -> sale price before discount, from the collection's public product list (a few requests)
async function loadComparePrices(page) {
  const prices = new Map()
  for (let n = 1; ; n++) {
    const products = await page.evaluate(
      async (url) => (await (await fetch(url)).json()).products,
      `${SITE}/collections/${handle}/products.json?limit=250&page=${n}`,
    )
    if (!products.length) return prices
    for (const p of products) {
      const compare = Number(p.variants[0]?.compare_at_price)
      if (compare > Number(p.variants[0].price)) prices.set(p.handle, Math.round(compare))
    }
    await sleep(DELAY_MS)
  }
}

async function main() {
  const dir = path.join(__dirname, 'output')
  mkdirSync(dir, { recursive: true })
  const pagesFile = path.join(dir, `${handle}.pages.json`)
  const outFile = path.join(dir, `${handle}.json`)

  // resume: keep the pages an earlier (stopped) run already scraped
  const pages = existsSync(pagesFile) ? JSON.parse(readFileSync(pagesFile, 'utf8')) : []
  const done = new Set(refresh ? [] : pages.map((p) => p.sourceUrl))
  const save = () => {
    writeFileSync(pagesFile, JSON.stringify(pages, null, 2))
    writeFileSync(outFile, JSON.stringify(buildEarrings(pages), null, 2))
  }
  if (pages.length) console.log(`Resuming: ${pages.length} pages already scraped`)

  const { browser, page } = await launch()

  // Ctrl+C saves progress before exiting
  process.on('SIGINT', () => {
    save()
    console.log(`\nStopped. Saved ${pages.length} pages -> ${outFile}`)
    process.exit(0)
  })

  try {
    if (categories.length) console.log(`Only the categories: ${categories.join(', ')}`)
    const links = await collectLinks(page, handle, Infinity, categoryQuery)
    const families = new Map()
    for (const href of links) families.set(familyKey(href), [...(families.get(familyKey(href)) ?? []), href])
    const wanted = [...families.values()].slice(0, limit)
    console.log(`Found ${links.length} product pages = ${families.size} pieces; scraping ${wanted.length}`)

    let count = 0
    for (const [i, hrefs] of wanted.entries()) {
      for (const href of hrefs) {
        if (done.has(`${SITE}${href}`)) continue
        try {
          // a page that times out once usually loads on the second try
          const scraped = await scrapePage(page, href).catch(() => sleep(2000).then(() => scrapePage(page, href)))
          const saved = pages.findIndex((p) => p.sourceUrl === scraped.sourceUrl) // a refresh replaces the old copy
          if (saved >= 0) pages[saved] = scraped
          else pages.push(scraped)
          console.log(`[${i + 1}/${wanted.length}] ${scraped.title}`)
          if (++count % SAVE_EVERY === 0) save()
        } catch (err) {
          console.error(`[${i + 1}/${wanted.length}] ${href} skipped: ${err.message}`)
        }
        await sleep(DELAY_MS)
      }
    }

    const compare = await loadComparePrices(page)
    for (const p of pages) p.compareAtPrice = compare.get(p.sourceUrl.split('/').pop())

    // the stone shape is only a filter on the collection page; match it to each page by its address
    const facets = await collectFacets(page, handle, ['shape', 'pendant_type', 'diamond_source_type'], categoryQuery)
    for (const p of pages) {
      const found = facets[new URL(p.sourceUrl).pathname]
      p.stoneSource = found?.diamond_source_type?.[0] // Lab Grown / Natural, for codes and titles that do not say
      p.shape = found?.shape?.[0]
      p.pendantType = found?.pendant_type?.[0] // necklaces only: Crosses, Evil Eyes, Hearts...
    }

    save()
    console.log(`Saved ${buildEarrings(pages).length} pieces (${pages.length} pages) -> ${outFile}`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
