// Merges the carat products of the scraped bracelets (2ct, 3ct... Diamond Tennis Bracelet) into one product
// with one variant per carat, type and metal.
//   node scripts/mergeBracelets.js
// Reads scripts/output/bracelets.json and writes scripts/output/bracelets.merged.json (the scrape is left as it is).
// Import the result with: node scripts/importWeddingRings.js scripts/output/bracelets.merged.json
// Nothing is written to the database.
const { readFileSync, writeFileSync } = require('node:fs')
const path = require('node:path')
const { variantTitle } = require('../src/utils/title')

const dir = path.join(__dirname, 'output')
const products = JSON.parse(readFileSync(path.join(dir, 'bracelets.json'), 'utf8'))

const TYPES = ['Lab Grown', 'Natural']
const METALS = ['white', 'yellow', 'rose', 'platinum']
const metalRank = (metal = '') => METALS.findIndex((word) => metal.toLowerCase().includes(word))

// "2ct Diamond Tennis Bracelet" -> 2 / "Diamond Tennis Bracelet"; names without a carat (letter bracelets) stay as they are
function splitCarat(name) {
  const m = name.match(/^(\d+(?:\.\d+)?)ct\s+(.+)$/i)
  return m ? { carat: Number(m[1]), base: m[2] } : { carat: undefined, base: name }
}

const groups = new Map()
for (const p of products) {
  const { carat, base } = splitCarat(p.name)
  const key = `${p.category}|${base}`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push({ product: p, carat, base })
}

const merged = [...groups.values()].map((members) => {
  members.sort((a, b) => (a.carat ?? 0) - (b.carat ?? 0))
  const { product: first, base } = members[0]

  const variants = members
    .flatMap(({ product, carat }) => product.variants.map((v) => ({ ...v, carat })))
    .sort(
      (a, b) =>
        (a.carat ?? 0) - (b.carat ?? 0) ||
        TYPES.indexOf(a.type ?? first.type) - TYPES.indexOf(b.type ?? first.type) ||
        metalRank(a.metal) - metalRank(b.metal),
    )
    .map((v) => ({ ...v, carat: v.carat })) // keeps `carat` only where the name had one

  const carats = members.map((m) => m.carat).filter((c) => c != null)
  return {
    ...first,
    name: base,
    carat: carats.length ? Math.min(...carats) : first.carat, // the smallest, so the product-level carat filter still finds it
    sourceUrl: undefined,
    variants,
  }
})

const check = merged.flatMap((p) => p.variants.map((v) => variantTitle(p.name, { carat: v.carat, type: v.type ?? p.type, metal: v.metal })))
const out = path.join(dir, 'bracelets.merged.json')
writeFileSync(out, JSON.stringify(merged, null, 2))

console.log(`${products.length} scraped products -> ${merged.length} products`)
console.log(`${merged.reduce((n, p) => n + p.variants.length, 0)} variants (scraped: ${products.reduce((n, p) => n + p.variants.length, 0)})`)
const multi = merged.filter((p) => p.variants.length > 4).map((p) => `${p.name}: ${[...new Set(p.variants.map((v) => v.carat))].join(', ')}ct`)
console.log('Merged carats:\n  ' + multi.join('\n  '))
console.log('Example titles:\n  ' + [check[0], check[4], check[check.length - 1]].join('\n  '))
console.log(`Saved -> ${out}`)
