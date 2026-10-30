// Merges the freshly scraped rings (scripts/output/rings.json) into scripts/output/wedding-rings.json,
// the file the rings are imported from.
//   node scripts/mergeRings.js
// A ring that is already there (same product code) is compared field by field and updated where it changed;
// a new ring is added. Fields the new scrape does not have (the wedding rings' gender, ring covering...) are kept.
// The old file is saved as wedding-rings.json.bak first. Nothing is written to the database.
const { copyFileSync, readFileSync, writeFileSync } = require('node:fs')
const { isDeepStrictEqual } = require('node:util')
const path = require('node:path')

const dir = path.join(__dirname, 'output')
const existingFile = path.join(dir, 'wedding-rings.json')
const incomingFile = path.join(dir, 'rings.json')

const existing = JSON.parse(readFileSync(existingFile, 'utf8'))
const incoming = JSON.parse(readFileSync(incomingFile, 'utf8'))

// every variant product code -> the ring it belongs to
const byCode = new Map()
existing.forEach((ring, i) => (ring.variants || []).forEach((v) => byCode.set(v.productCode, i)))

// copies the fields of `next` onto `current` when they differ; returns the names of the fields that changed
function update(current, next, skip = []) {
  const changed = []
  for (const [key, value] of Object.entries(next)) {
    if (skip.includes(key) || value === undefined) continue
    if (!isDeepStrictEqual(current[key], value)) {
      current[key] = value
      changed.push(key)
    }
  }
  return changed
}

let added = 0
let unchanged = 0
const updated = []
const fieldCounts = {}
const count = (names) => names.forEach((n) => (fieldCounts[n] = (fieldCounts[n] || 0) + 1))

for (const ring of incoming) {
  const at = (ring.variants || []).map((v) => byCode.get(v.productCode)).find((i) => i !== undefined)
  if (at === undefined) {
    existing.push(ring)
    ring.variants.forEach((v) => byCode.set(v.productCode, existing.length - 1))
    added++
    continue
  }

  const current = existing[at]
  const changed = update(current, ring, ['variants'])
  current.variants ||= []
  for (const v of ring.variants) {
    const old = current.variants.find((x) => x.productCode === v.productCode)
    if (!old) {
      current.variants.push(v)
      changed.push(`variant ${v.productCode} added`)
    } else {
      changed.push(...update(old, v).map((f) => `variant.${f}`))
    }
  }
  if (changed.length) {
    updated.push(`${current.name}: ${changed.join(', ')}`)
    count(changed.map((c) => c.replace(/ .*/, '')))
  } else unchanged++
}

// the file is only rewritten (and the old one kept as .bak) when something changed
if (added || updated.length) {
  copyFileSync(existingFile, `${existingFile}.bak`)
  writeFileSync(existingFile, JSON.stringify(existing, null, 2))
}

console.log(`Rings scraped: ${incoming.length}`)
console.log(`  added:     ${added}`)
console.log(`  updated:   ${updated.length}`)
console.log(`  unchanged: ${unchanged}`)
if (updated.length) {
  console.log('Fields that changed (rings affected):', JSON.stringify(fieldCounts))
  updated.slice(0, 10).forEach((line) => console.log(`  ${line}`))
  if (updated.length > 10) console.log(`  ...and ${updated.length - 10} more`)
}
console.log(`Saved ${existing.length} rings -> ${existingFile}`)
