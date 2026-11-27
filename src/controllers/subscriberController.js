const Subscriber = require('../models/Subscriber')
const { paginate, search, listResponse } = require('../utils/query')

async function create(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase()
  await Subscriber.findOneAndUpdate({ email }, { $setOnInsert: { email } }, { upsert: true, runValidators: true })
  res.status(201).json({ message: 'Subscribed' })
}

async function list(req, res) {
  const paging = paginate(req.query)
  const filter = req.query.q ? search(req.query.q, ['email']) : {}
  const [items, total] = await Promise.all([
    Subscriber.find(filter).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit),
    Subscriber.countDocuments(filter),
  ])
  res.json(listResponse(items, total, paging))
}

// DELETE /:id
async function remove(req, res) {
  const doc = await Subscriber.findByIdAndDelete(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Subscriber not found' })
  res.json({ message: 'Subscriber deleted', id: doc.id })
}

module.exports = { create, list, remove }
