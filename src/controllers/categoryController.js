const Category = require('../models/Category')
const { uniqueSlug } = require('../utils/slug')
const { paginate, search, pickFilters, listResponse } = require('../utils/query')

const FILTER_FIELDS = ['active', 'showOnHome']
const SORT = { order: 1, createdAt: 1 }


async function listCategories(req, res) {
  const paging = paginate(req.query)
  const filter = pickFilters(req.query, FILTER_FIELDS)
  if (req.query.q) Object.assign(filter, search(req.query.q, ['title']))

  const [items, total] = await Promise.all([
    Category.find(filter).sort(SORT).skip(paging.skip).limit(paging.limit),
    Category.countDocuments(filter),
  ])
  res.json(listResponse(items, total, paging))
}


async function getOneCategory(req, res) {
  const doc = await Category.findById(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Category not found' })
  res.json(doc)
}


async function createCategory(req, res) {
  const { slug, ...data } = req.body 
  if (!data.title?.trim()) return res.status(400).json({ message: 'Title is required' })

  const doc = await Category.create({ ...data, slug: await uniqueSlug(Category, data.title) })
  res.status(201).json(doc)
}


async function updateCategory(req, res) {
  const { slug, ...data } = req.body // changing a title keeps the old link working
  if ('title' in data && !data.title?.trim()) return res.status(400).json({ message: 'Title is required' })

  const doc = await Category.findByIdAndUpdate(req.params.id, data, {
    returnDocument: 'after',
    runValidators: true,
  })
  if (!doc) return res.status(404).json({ message: 'Category not found' })
  res.json(doc)
}


async function setStatusCategory(req, res) {
  if (typeof req.body.active !== 'boolean') {
    return res.status(400).json({ message: '"active" must be true or false' })
  }
  const doc = await Category.findByIdAndUpdate(
    req.params.id,
    { active: req.body.active },
    { returnDocument: 'after' },
  )
  if (!doc) return res.status(404).json({ message: 'Category not found' })
  res.json(doc)
}

async function removeCategory(req, res) {
  const doc = await Category.findByIdAndDelete(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Category not found' })
  res.json({ message: 'Category deleted', id: doc.id })
}

module.exports = { listCategories, getOneCategory, createCategory, updateCategory, setStatusCategory, removeCategory }
