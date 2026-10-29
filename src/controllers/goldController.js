const { getGold } = require('../services/goldService')

// GET /  ?range=1W|1M|3M|1Y
async function get(req, res) {
  try {
    res.json(await getGold(req.query.range))
  } catch (err) {
    res.status(502).json({ message: err.message })
  }
}

module.exports = { get }
