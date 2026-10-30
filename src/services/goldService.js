const GoldPrice = require('../models/GoldPrice')

const SOURCE_URL = 'https://api.gold-api.com/price/XAU'
const HISTORY_URL = 'https://api.gold-api.com/history'
const CACHE_MS = 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const RATES = { AED: 3.6725, USD: 1, SAR: 3.75, QAR: 3.64 }
const RANGE_DAYS = { '1W': 7, '1M': 30, '3M': 90, '1Y': 365 }

let cached = null // { usd, updatedAt, fetchedAt }

async function fetchLive() {
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) return cached

  const res = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`Gold price source failed (${res.status})`)
  const body = await res.json()
  if (typeof body.price !== 'number') throw new Error('Gold price source sent an unexpected response')

  cached = { usd: body.price, updatedAt: body.updatedAt, fetchedAt: Date.now() }
  return cached
}

// stores the current price for this hour (first write wins)
async function recordPrice() {
  const live = await fetchLive()
  const hour = new Date(Math.floor(Date.now() / HOUR_MS) * HOUR_MS)
  await GoldPrice.updateOne({ hour }, { $setOnInsert: { usd: live.usd } }, { upsert: true })
  return live
}

// hourly points for a week, last price of each day for longer ranges
function downsample(rows, daily) {
  if (!daily) return rows.map((r) => ({ date: r.hour, usd: r.usd }))
  const byDay = new Map()
  for (const r of rows) byDay.set(Math.floor(r.hour.getTime() / DAY_MS), r)
  return [...byDay.values()].map((r) => ({ date: r.hour, usd: r.usd }))
}

async function getGold(range) {
  const days = RANGE_DAYS[range] ?? RANGE_DAYS['1M']
  const live = await recordPrice()
  const rows = await GoldPrice.find({ hour: { $gte: new Date(Date.now() - days * DAY_MS) } }).sort({ hour: 1 })

  return {
    rates: RATES,
    current: { usd: live.usd, updatedAt: live.updatedAt },
    history: downsample(rows, days > 7),
  }
}

// Fills the last year of daily prices from the history endpoint. Needs GOLD_API_KEY;
// the free plan allows 10 history calls an hour, so it runs only when a year is not stored yet, then daily.
async function backfillHistory({ force = false } = {}) {
  if (!process.env.GOLD_API_KEY) return 0

  // dev restarts (node --watch) must not burn the hourly limit: skip when a year is already stored
  if (!force) {
    const oldest = await GoldPrice.findOne().sort({ hour: 1 })
    if (oldest && Date.now() - oldest.hour.getTime() > 360 * DAY_MS) return 0
  }

  const end = Math.floor(Date.now() / 1000)
  const start = end - 365 * 24 * 60 * 60
  const query = new URLSearchParams({
    symbol: 'XAU',
    startTimestamp: start,
    endTimestamp: end,
    groupBy: 'day',
    aggregation: 'avg',
    orderBy: 'asc',
  })
  const res = await fetch(`${HISTORY_URL}?${query}`, {
    headers: { 'x-api-key': process.env.GOLD_API_KEY },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`Gold history source failed (${res.status})`)

  const rows = await res.json()
  // the API sends prices as strings and days as "2026-09-29 00:00:00" (UTC)
  const ops = rows
    .map((r) => ({ hour: new Date(`${String(r.day).slice(0, 10)}T00:00:00Z`), usd: Number(r.avg_price) }))
    .filter((r) => !Number.isNaN(r.hour.getTime()) && r.usd > 0)
    .map((r) => ({
      updateOne: {
        filter: { hour: r.hour },
        update: { $setOnInsert: { usd: r.usd } },
        upsert: true,
      },
    }))
  if (ops.length) await GoldPrice.bulkWrite(ops)
  return ops.length
}

module.exports = { getGold, recordPrice, backfillHistory }
