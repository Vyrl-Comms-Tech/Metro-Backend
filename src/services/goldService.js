// Dubai retail gold rate per gram in AED, with no markup. 24K to 18K come from the source as sent;
// the source has no 14K, so it is worked out from 24K by purity (14/24)
const SOURCE_URL = 'https://mazimo.ae/api/gold'
const CACHE_MS = 5 * 60 * 1000
const RETRY_MS = 60 * 1000 
const KARATS = [24, 22, 21, 18] 

let cached = null 
let nextFetchAt = 0
let lastError = null
let pending = null

async function requestRates() {
  const res = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`Gold price source failed (${res.status})`)
  const body = await res.json()

  const valid = KARATS.every((_, i) => Number.isFinite(body.k?.[i]) && body.k[i] > 0)
  if (!valid || Number.isNaN(Date.parse(body.asOf))) {
    throw new Error('Gold price source sent an unexpected response')
  }
  const rates = KARATS.map((karat, i) => ({ label: `${karat}K GOLD`, aed: body.k[i] }))
  rates.push({ label: '14K GOLD', aed: +((body.k[0] * 14) / 24).toFixed(2) })

  return {
    rates,
    asOf: body.asOf, // when these rates were published
  }
}

async function getGold() {
  if (Date.now() >= nextFetchAt) {
    // requests arriving together share one call to the source
    pending ??= requestRates()
      .then((result) => {
        cached = result
        lastError = null
        nextFetchAt = Date.now() + CACHE_MS
      })
      .catch((err) => {
        lastError = err
        nextFetchAt = Date.now() + RETRY_MS
        console.error('Gold price refresh failed:', err.message)
      })
      .finally(() => {
        pending = null
      })
    await pending
  }
  if (!cached) throw lastError
  return cached
}

module.exports = { getGold }
