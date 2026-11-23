const { getGold } = require('../services/goldService')

// GET /  -> today's rates per gram: [{ label: '24K GOLD', aed: 438.25 }, ...]
async function get(req, res) {
  try {
    res.json(await getGold())
  } catch (err) {
    res.status(502).json({ message: err.message })
  }
}

module.exports = { get }
