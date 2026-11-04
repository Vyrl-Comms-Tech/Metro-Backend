const Enquiry = require('../models/Enquiry')
const { paginate, search, listResponse } = require('../utils/query')


async function create(req, res) {
  const { name, email, phone, message } = req.body
  const doc = await Enquiry.create({ name, email, phone, message })
  res.status(201).json({ message: 'Enquiry received', id: doc.id })
}

async function list(req, res) {
  const paging = paginate(req.query)
  const filter = req.query.q ? search(req.query.q, ['name', 'email', 'phone', 'message']) : {}
  if (req.query.read === 'true') filter.read = true
  if (req.query.read === 'false') filter.read = false

  const [items, total, unread] = await Promise.all([
    Enquiry.find(filter).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit),
    Enquiry.countDocuments(filter),
    Enquiry.countDocuments({ read: false }),
  ])
  res.json({ ...listResponse(items, total, paging), unread })
}

// GET /:id
async function getOne(req, res) {
  const doc = await Enquiry.findById(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Enquiry not found' })
  res.json(doc)
}

// PUT /:id  only the read flag can change
async function update(req, res) {
  const doc = await Enquiry.findByIdAndUpdate(req.params.id, { read: Boolean(req.body.read) }, { new: true })
  if (!doc) return res.status(404).json({ message: 'Enquiry not found' })
  res.json(doc)
}

// DELETE /:id
async function remove(req, res) {
  const doc = await Enquiry.findByIdAndDelete(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Enquiry not found' })
  res.json({ message: 'Enquiry deleted', id: doc.id })
}

module.exports = { create, list, getOne, update, remove }
