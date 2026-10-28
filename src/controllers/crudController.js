// Builds the five standard handlers for a Mongoose model.
//   searchFields: fields matched by ?q=
//   filterFields: fields that can be filtered with ?field=value
//   sort:         default sort order of the list
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function createCrudController(Model, { searchFields = [], filterFields = [], sort = { createdAt: -1 } } = {}) {
  const notFound = (res) => res.status(404).json({ message: 'Not found' })

  // GET /  ?page=1&limit=20&q=text&field=value
  async function list(req, res) {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 20))

    const filter = {}
    for (const field of filterFields) {
      if (req.query[field]) filter[field] = String(req.query[field])
    }
    if (req.query.q && searchFields.length) {
      const pattern = new RegExp(escapeRegex(String(req.query.q)), 'i')
      filter.$or = searchFields.map((field) => ({ [field]: pattern }))
    }

    const [items, total] = await Promise.all([
      Model.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      Model.countDocuments(filter),
    ])

    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
  }

  // GET /:id
  async function getOne(req, res) {
    const doc = await Model.findById(req.params.id)
    if (!doc) return notFound(res)
    res.json(doc)
  }

  // POST /
  async function create(req, res) {
    const doc = await Model.create(req.body)
    res.status(201).json(doc)
  }

  // PUT /:id
  async function update(req, res) {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    })
    if (!doc) return notFound(res)
    res.json(doc)
  }

  // DELETE /:id
  async function remove(req, res) {
    const doc = await Model.findByIdAndDelete(req.params.id)
    if (!doc) return notFound(res)
    res.json({ message: 'Deleted', id: doc.id })
  }

  return { list, getOne, create, update, remove }
}

module.exports = createCrudController
