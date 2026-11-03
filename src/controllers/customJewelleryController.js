const CustomJewellery = require('../models/CustomJewellery')
const { paginate, search, listResponse } = require('../utils/query')

const SORT = { order: 1, createdAt: 1 }

// GET /  ?page=1&limit=20&q=text&active=true
async function list(req, res) {
  const paging = paginate(req.query)
  const filter = req.query.q ? search(req.query.q, ['title']) : {}
  // ?active=true lists the visible items (older items have no flag, so only an explicit false hides one)
  if (req.query.active === 'true') filter.active = { $ne: false }
  if (req.query.active === 'false') filter.active = false

  const [items, total] = await Promise.all([
    CustomJewellery.find(filter).sort(SORT).skip(paging.skip).limit(paging.limit),
    CustomJewellery.countDocuments(filter),
  ])
  res.json(listResponse(items, total, paging))
}

// GET /:id
async function getOne(req, res) {
  const doc = await CustomJewellery.findById(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Item not found' })
  res.json(doc)
}

// POST /
async function create(req, res) {
  const doc = await CustomJewellery.create(req.body)
  res.status(201).json(doc)
}

// PUT /:id  (validate on the merged document so the image/video rule still holds)
async function update(req, res) {
  const doc = await CustomJewellery.findById(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Item not found' })
  doc.set(req.body)
  await doc.save()
  res.json(doc)
}

// DELETE /:id
async function remove(req, res) {
  const doc = await CustomJewellery.findByIdAndDelete(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Item not found' })
  res.json({ message: 'Item deleted', id: doc.id })
}

module.exports = { list, getOne, create, update, remove }
