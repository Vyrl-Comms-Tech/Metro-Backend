const { getGold } = require('../services/goldService')

// GET /  -> today's rates per gram: { rates: [{ label: '24K GOLD', aed: 437.5 }, ...], asOf }
async function get(req, res) {
  try {
    res.json(await getGold())
  } catch (err) {
    res.status(502).json({ message: err.message })
  }
}

module.exports = { get }
