const Content = require('../models/Content')

// the editable website text lives in one document with this key
const KEY = 'site'

// GET /
async function getContent(req, res) {
  const doc = await Content.findOne({ key: KEY })
  res.json(doc?.data ?? {})
}

// PUT /  (replaces the stored content with the request body)
async function saveContent(req, res) {
  const doc = await Content.findOneAndUpdate(
    { key: KEY },
    { data: req.body },
    { upsert: true, returnDocument: 'after', runValidators: true },
  )
  res.json(doc.data)
}

module.exports = { getContent, saveContent }
