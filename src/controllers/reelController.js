const Reel = require('../models/Reel')
const { paginate, search, pickFilters, listResponse } = require('../utils/query')

const FILTER_FIELDS = []
const SORT = { order: 1, createdAt: 1 }

// GET /  ?page=1&limit=20&q=text&field=value
async function list(req, res) {
  const paging = paginate(req.query)
  const filter = pickFilters(req.query, FILTER_FIELDS)
  if (req.query.q) Object.assign(filter, search(req.query.q, ['name', 'tags']))

  const [items, total] = await Promise.all([
    Reel.find(filter).sort(SORT).skip(paging.skip).limit(paging.limit),
    Reel.countDocuments(filter),
  ])
  res.json(listResponse(items, total, paging))
}

// GET /:id
async function getOne(req, res) {
  const doc = await Reel.findById(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Reel not found' })
  res.json(doc)
}

// POST /
async function create(req, res) {
  const doc = await Reel.create(req.body)
  res.status(201).json(doc)
}

// PUT /:id
async function update(req, res) {
  const doc = await Reel.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: 'after',
    runValidators: true,
  })
  if (!doc) return res.status(404).json({ message: 'Reel not found' })
  res.json(doc)
}

// DELETE /:id
async function remove(req, res) {
  const doc = await Reel.findByIdAndDelete(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Reel not found' })
  res.json({ message: 'Reel deleted', id: doc.id })
}

module.exports = { list, getOne, create, update, remove }
