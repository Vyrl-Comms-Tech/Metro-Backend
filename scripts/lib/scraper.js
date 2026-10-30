// Shared by the collection scrapers: browser setup, collection paging and product-details parsing.
const { chromium } = require('playwright')

const SITE = 'https://fergusjames.com'
const DELAY_MS = 400
const SAVE_EVERY = 20
const USER_AGENT = 'MetroJewellers-CatalogBot/1.0 (agent-initiated, read-only)'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function parseArgs(defaultHandle) {
  const args = process.argv.slice(2)
  const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1]) || Infinity
  const [handle = defaultHandle, slug = handle] = args.filter((a) => !a.startsWith('--'))
  return { handle, slug, limit }
}

async function launch() {
  const browser = await chromium.launch()
  const context = await browser.newContext({ userAgent: USER_AGENT })
  await context.route('**/*', (route) =>
    ['image', 'font', 'media', 'stylesheet'].includes(route.request().resourceType()) ? route.abort() : route.continue(),
  )
  return { browser, page: await context.newPage() }
}

async function collectLinks(page, handle, limit = Infinity, query = '') {
  const links = new Set()
  for (let n = 1; ; n++) {
    await page.goto(`${SITE}/collections/${handle}?page=${n}${query}`, { waitUntil: 'domcontentloaded' })
    const found = await page.$$eval('main a[href*="/products/"]', (anchors) => anchors.map((a) => new URL(a.href).pathname))
    const before = links.size
    found.forEach((href) => links.add(href))
    console.log(`collection page ${n}: ${links.size - before} new products`)
    if (links.size === before || links.size >= limit) return [...links].slice(0, limit)
    await sleep(DELAY_MS)
  }
}

// Filters that are only shown on the collection page (gender, plain/diamond, ring style...), not on the product page.
// Walks every value of the small list filters and returns { "/products/x": { gender: ['Male'], shape: ['Plain'], ... } }
// width / carat / price are skipped: they are already read from the product itself.
const SKIP_FACETS = new Set(['width', 'carat_weight', 'price'])

// `only` limits it to some filter names, e.g. ['shape']
// `query` is added to every walk, e.g. '&filter.p.m.custom.category=Eternity+Rings' to stay inside some categories
async function collectFacets(page, handle, only, query = '') {
  await page.goto(`${SITE}/collections/${handle}`, { waitUntil: 'networkidle' })
  const inputs = await page.$$eval('input[type=checkbox][name^="filter."]', (els) =>
    els.map((e) => ({ name: e.name, value: e.value })),
  )
  const byProduct = {}
  for (const { name, value } of inputs) {
    const key = name.split('.').pop()
    if (SKIP_FACETS.has(key) || (only && !only.includes(key))) continue
    const hrefs = await collectLinks(page, handle, Infinity, `&${encodeURIComponent(name)}=${encodeURIComponent(value)}${query}`)
    console.log(`facet ${key}=${value}: ${hrefs.length} products`)
    for (const href of hrefs) ((byProduct[href] ||= {})[key] ||= []).push(value)
    await sleep(DELAY_MS)
  }
  return byProduct
}

async function readDetails(page) {
  const text = await page.evaluate(() => {
    const heading = [...document.querySelectorAll('*')].find(
      (e) => e.children.length === 0 && /^\s*product details\s*$/i.test(e.textContent),
    )
    let node = heading
    for (let i = 0; i < 5 && node; i++) {
      node = node.parentElement
      if (node && node.innerText.length > 150) break
    }
    return node ? node.innerText : ''
  })

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const fields = {}
  let productCode
  lines.forEach((line, i) => {
    if (/^product code$/i.test(line)) productCode = lines[i + 1]
    const m = line.match(/^([^:]{2,40}):\s*(.+)$/)
    if (m) fields[m[1].toLowerCase()] = m[2].trim()
  })
  return { fields, productCode }
}

// maps the "Label: value" lines onto the Product model fields
function productFields(fields) {
  const stoneKey = Object.keys(fields).find((k) => /(diamonds?|sapphires?|rub(y|ies)|emeralds?|tanzanites?|garnets?|beryls?|spinels?|gemstones?)/.test(k))
  const width = parseFloat(fields.width)
  const carat = parseFloat(fields[stoneKey]?.match(/(\d+(?:\.\d+)?)\s*cts?/i)?.[1])
  return {
    type: /lab/.test(stoneKey || '') ? 'Lab Grown' : /natural/.test(stoneKey || '') ? 'Natural' : undefined,
    metal: fields.metal?.replace(/\s*-\s*[\d.\-]+g$/, ''),
    gemstone: stoneKey?.replace(/(igi|gia|natural|lab[- ]grown)\s*/g, '').trim() || undefined,
    width: Number.isNaN(width) ? undefined : width,
    carat: Number.isNaN(carat) ? undefined : carat,
  }
}

module.exports = { SITE, DELAY_MS, SAVE_EVERY, sleep, parseArgs, launch, collectLinks, collectFacets, readDetails, productFields }
