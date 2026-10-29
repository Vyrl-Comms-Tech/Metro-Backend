// Scrapes a public Shopify collection into a local JSON file for review.
//   node scripts/scrapeCollection.js [collection-handle] [collection-slug]
//   node scripts/scrapeCollection.js wedding-rings wedding-rings
// Output: scripts/output/<handle>.json  (nothing is written to the database or R2)
const { mkdirSync, writeFileSync } = require('node:fs')
const path = require('node:path')

const SITE = 'https://fergusjames.com'
const [handle = 'wedding-rings', slug = handle] = process.argv.slice(2)
const PAGE_SIZE = 250
const DELAY_MS = 1000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const stripHtml = (html = '') =>
  html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

// description lines look like "Width: 2mm", "Metal: 18K Yellow Gold - 2.2g"
const field = (text, label) => text.match(new RegExp(`${label}:\s*(.+?)(?=\s+[A-Z][A-Za-z ]+:|$)`))?.[1]?.trim()

async function fetchPage(page) {
  const url = `${SITE}/collections/${handle}/products.json?limit=${PAGE_SIZE}&page=${page}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MetroJewellers-CatalogBot/1.0 (agent-initiated, read-only)' },
    signal: AbortSignal.timeout(20000),
  })
  if (res.status === 429) {
    await sleep(Number(res.headers.get('retry-after') || 5) * 1000)
    return fetchPage(page)
  }
  if (!res.ok) throw new Error(`${url} failed (${res.status})`)
  return (await res.json()).products
}

function toProduct(p) {
  const text = stripHtml(p.body_html)
  const width = parseFloat(field(text, 'Width'))
  const carat = parseFloat(text.match(/(\d+(?:\.\d+)?)\s*ct/i)?.[1])
  const metal = field(text, 'Metal')?.replace(/\s*-\s*[\d.]+g$/, '')

  return {
    name: p.title,
    collectionSlug: slug,
    category: p.product_type || undefined,
    type: /lab/i.test(text) ? 'Lab Grown' : /natural/i.test(text) ? 'Natural' : undefined,
    metal,
    gemstone: text.match(/(?:Natural|Lab[- ]Grown)\s+(\w+\s+Diamonds?)/i)?.[1],
    width: Number.isNaN(width) ? undefined : width,
    carat: Number.isNaN(carat) ? undefined : carat,
    description: text,
    images: p.images.map((img) => img.src), // source URLs only, not re-hosted
    sourceUrl: `${SITE}/products/${p.handle}`,
  }
}

async function main() {
  const products = []
  for (let page = 1; ; page++) {
    const batch = await fetchPage(page)
    if (!batch.length) break
    products.push(...batch.map(toProduct))
    console.log(`page ${page}: ${batch.length} products`)
    if (batch.length < PAGE_SIZE) break
    await sleep(DELAY_MS)
  }

  const dir = path.join(__dirname, 'output')
  mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${handle}.json`)
  writeFileSync(file, JSON.stringify(products, null, 2))
  console.log(`Saved ${products.length} products -> ${file}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
