// Adds the stone shape (Round, Oval, Pear...) to scripts/output/earrings.json.
//   node scripts/addEarringShapes.js
// The site only shows shape as a filter on the collection page, so every shape is walked there and
// matched to the earring by the page address of any of its variants. Nothing is written to the database.
const { readFileSync, writeFileSync } = require('node:fs')
const path = require('node:path')
const { launch, collectFacets } = require('./lib/scraper')

const file = path.join(__dirname, 'output/earrings.json')

async function main() {
  const earrings = JSON.parse(readFileSync(file, 'utf8'))
  const { browser, page } = await launch()
  try {
    const facets = await collectFacets(page, 'earrings', ['shape'])
    let found = 0
    for (const e of earrings) {
      const shapes = new Set(e.variants.flatMap((v) => facets[new URL(v.sourceUrl).pathname]?.shape ?? []))
      e.shape = [...shapes][0] // a pair of earrings has one shape; the filter lists it once
      if (shapes.size > 1) console.warn(`${e.name}: more than one shape (${[...shapes].join(', ')}), kept ${e.shape}`)
      if (e.shape) found++
    }
    writeFileSync(file, JSON.stringify(earrings, null, 2))
    console.log(`Shape found for ${found} of ${earrings.length} earrings -> ${file}`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
