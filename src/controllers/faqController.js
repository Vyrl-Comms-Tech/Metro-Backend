const Faq = require('../models/Faq')
const { paginate, search, pickFilters, listResponse } = require('../utils/query')

const FILTER_FIELDS = ['category', 'featured']
const SORT = { order: 1, createdAt: 1 }

// GET /  ?page=1&limit=20&q=text&field=value
async function list(req, res) {
  const paging = paginate(req.query)
  const filter = pickFilters(req.query, FILTER_FIELDS)
  if (req.query.q) Object.assign(filter, search(req.query.q, ['question']))

  const [items, total] = await Promise.all([
    Faq.find(filter).sort(SORT).skip(paging.skip).limit(paging.limit),
    Faq.countDocuments(filter),
  ])
  res.json(listResponse(items, total, paging))
}

// GET /:id
async function getOne(req, res) {
  const doc = await Faq.findById(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Faq not found' })
  res.json(doc)
}

// POST /
async function create(req, res) {
  const doc = await Faq.create(req.body)
  res.status(201).json(doc)
}

// PUT /:id
async function update(req, res) {
  const doc = await Faq.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: 'after',
    runValidators: true,
  })
  if (!doc) return res.status(404).json({ message: 'Faq not found' })
  res.json(doc)
}

// DELETE /:id
async function remove(req, res) {
  const doc = await Faq.findByIdAndDelete(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Faq not found' })
  res.json({ message: 'Faq deleted', id: doc.id })
}

module.exports = { list, getOne, create, update, remove }
