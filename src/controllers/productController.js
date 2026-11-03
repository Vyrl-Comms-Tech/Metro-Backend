const Product = require('../models/Product')
const Category = require('../models/Category')
const { slugify } = require('../utils/slug')
const { checkCategoryPath } = require('../utils/categoryPath')
const { wordMatch, paginate, search, pickFilters, listResponse } = require('../utils/query')
const { variantTitle } = require('../utils/title')

const FILTER_FIELDS = ['mainCategory', 'subCategory', 'category', 'type', 'metal', 'gemstone', 'shape', 'gender', 'ringCovering', 'style', 'pendantType']

const SORTS = { az: ['name', 1], za: ['name', -1], priceAsc: ['price', 1], priceDesc: ['price', -1] }
function sortFor(sort, pricePath) {
  const [field, dir] = SORTS[sort] ?? ['createdAt', -1]
  return { [field === 'price' ? pricePath : field]: dir, _id: 1 }
}

const VARIANT_FILTERS = { type: 'variants.type', metal: 'variants.metal' }

const RANGE_FIELDS = ['width', 'carat']

function listFilter(query) {
  const filter = {}
  const params = { ...query, type: query.type ?? query.diamondType }
  for (const [key, value] of Object.entries(pickFilters(params, FILTER_FIELDS))) {
    const values = value.split(',').map((v) => v.trim()).filter(Boolean)
    filter[VARIANT_FILTERS[key] ?? key] = values.length > 1 ? { $in: values } : values[0]
  }
  // onlyCategory=Plain,Diamond keeps just those categories (a chosen category must be one of them)
  const only = String(query.onlyCategory ?? '').split(',').map((v) => v.trim()).filter(Boolean)
  if (only.length) {
    const chosen = filter.category?.$in ?? (filter.category ? [filter.category] : [])
    filter.category = { $in: chosen.length ? chosen.filter((c) => only.includes(c)) : only }
  }
  // notCategory=Plain,Diamond leaves those categories out (View All Rings without the wedding rings)
  const notCategory = String(query.notCategory ?? '').split(',').map((v) => v.trim()).filter(Boolean)
  if (notCategory.length) {
    const chosen = filter.category
    filter.category = { ...(chosen && (typeof chosen === 'string' ? { $in: [chosen] } : chosen)), $nin: notCategory }
  }
  // ?q= matches the variation names, so a variation list (and the filter counts) only holds the variations that match
  if (query.q) filter['variants.name'] = wordMatch(query.q)
  for (const field of RANGE_FIELDS) {
    const min = query[`${field}Min`]
    const max = query[`${field}Max`]
    const range = {}
    if (min !== undefined && min !== '' && !Number.isNaN(Number(min))) range.$gte = Number(min)
    if (max !== undefined && max !== '' && !Number.isNaN(Number(max))) range.$lte = Number(max)
    if (Object.keys(range).length) filter[field] = range
  }
  return filter
}

const flag = (value) => ['true', '1'].includes(String(value).toLowerCase())

// what a product card and the shop filters need, nothing else
const CARD_FIELDS = ['name', 'mainCategory', 'subCategory', 'category', 'gemstone', 'shape', 'width', 'carat', 'gender', 'ringCovering', 'pendantType']
const keep = (fields) => Object.fromEntries(fields.map((k) => [k, 1]))

const variantPart = (filter) => Object.fromEntries(Object.entries(filter).filter(([key]) => key.startsWith('variants.')))

// a row built by an aggregation shows one variation: its `name` becomes the full title, the product's name moves to `baseName`
// `key` is the field holding the variation's own carat
const withTitle = (key) => (item) => {
  const { [key]: carat, variantName, ...rest } = item
  return {
    ...rest,
    carat: carat ?? rest.carat,
    name: variantName || variantTitle(rest.name, { carat, type: rest.type, metal: rest.metal }),
    baseName: rest.name,
  }
}

async function list(req, res) {
  const paging = paginate(req.query)
  const filter = listFilter(req.query)
  const card = flag(req.query.cardDetails)
  const perVariation = flag(req.query.withVariation)
  const sort = req.query.sort

  const [products, variationTotal, variantGroups] = await Promise.all([
    Product.countDocuments(filter),
    Product.aggregate([
      { $match: filter },
      { $unwind: '$variants' },
      { $match: variantPart(filter) },
      { $count: 'n' },
    ]),
    Product.aggregate([
      { $match: filter },
      { $group: { _id: { $size: { $ifNull: ['$variants', []] } }, products: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ])
  const variantBreakdown = variantGroups.map((g) => ({ variants: g._id, products: g.products }))
  const variations = variationTotal[0]?.n ?? 0
  const total = perVariation ? variations : products

  let items
  if (perVariation) {
    // every variation becomes its own row, carrying the product's name and categories
    items = await Product.aggregate([
      { $match: filter },
      { $unwind: { path: '$variants', includeArrayIndex: 'variationIndex' } },
      { $match: variantPart(filter) },
      { $sort: { ...sortFor(sort, 'variants.price'), variationIndex: 1 } },
      { $skip: paging.skip },
      { $limit: paging.limit },
      {
        $project: {
          _id: 0,
          id: '$_id',
          ...keep(CARD_FIELDS),
          type: '$variants.type',
          variationCarat: '$variants.carat',
          variantName: '$variants.name',
          slug: '$variants.slug',
          metal: '$variants.metal',
          metalCode: '$variants.metalCode',
          productCode: '$variants.productCode',
          price: '$variants.price',
          compareAtPrice: '$variants.compareAtPrice',
          ...(card
            ? { image: { $arrayElemAt: ['$variants.images', 0] }, hoverImage: { $arrayElemAt: ['$variants.images', 1] } }
            : { images: '$variants.images', details: '$variants.details', sourceUrl: '$variants.sourceUrl', description: 1 }),
        },
      },
    ])
  } else if (card) {
    items = await Product.aggregate([
      { $match: filter },
      { $sort: sortFor(sort, 'variants.0.price') },
      { $skip: paging.skip },
      { $limit: paging.limit },
      { $addFields: { first: { $arrayElemAt: ['$variants', 0] } } },
      {
        $project: {
          _id: 0,
          id: '$_id',
          ...keep(CARD_FIELDS),
          type: '$first.type',
          firstCarat: '$first.carat',
          variantName: '$first.name',
          slug: '$first.slug',
          metal: '$first.metal',
          price: '$first.price',
          compareAtPrice: '$first.compareAtPrice',
          image: { $arrayElemAt: ['$first.images', 0] },
          hoverImage: { $arrayElemAt: ['$first.images', 1] }, // the second photo, for the card's hover
          variationCount: { $size: { $ifNull: ['$variants', []] } },
        },
      },
    ])
  } else {
    items = await Product.find(filter).sort(sortFor(sort, 'variants.0.price')).skip(paging.skip).limit(paging.limit)
  }

  if (perVariation) items = items.map(withTitle('variationCarat'))
  else if (card) items = items.map(withTitle('firstCarat'))

  res.json({
    ...listResponse(items, total, paging),
    totalProducts: products,
    totalVariants: variantBreakdown.reduce((n, g) => n + g.variants * g.products, 0), // every variant of the matching products
    variantBreakdown,
  })
}

// Each facet: the field it counts, the query parameter that filters it (its own selection is left out of its own counts)
const FACETS = {
  gender: { field: 'gender', params: ['gender'] },
  ringCovering: { field: 'ringCovering', params: ['ringCovering'] },
  style: { field: 'style', params: ['style'] },
  diamondType: { field: 'variants.type', params: ['type', 'diamondType'] },
  category: { field: 'category', params: ['category'] },
  shape: { field: 'shape', params: ['shape'] },
  metal: { field: 'variants.metal', params: ['metal'] },
  gemstone: { field: 'gemstone', params: ['gemstone'] },
  pendantType: { field: 'pendantType', params: ['pendantType'] },
}

// The options of every filter with how many products match, given the filters already chosen.
// perProduct=true counts each product once (wedding rings are listed one card per product) instead of once per variation.
async function filters(req, res) {
  const perProduct = flag(req.query.perProduct)

  const count = async ({ field, params }) => {
    const query = { ...req.query }
    params.forEach((name) => delete query[name]) // choosing a shape must not shrink the list of shapes
    const filter = listFilter(query)
    const variantLevel = field.startsWith('variants.')
    const stages = variantLevel || !perProduct
      ? [{ $match: filter }, { $unwind: '$variants' }, { $match: variantPart(filter) }]
      : [{ $match: filter }]
    const rows = await Product.aggregate([
      ...stages,
      { $match: { [field]: { $nin: [null, ''] } } },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    return rows.map((r) => ({ value: r._id, count: r.count }))
  }

  const names = Object.keys(FACETS)
  const results = await Promise.all(names.map((name) => count(FACETS[name])))
  res.json(Object.fromEntries(names.map((name, i) => [name, results[i]])))
}

// GET /:id
async function getOne(req, res) {
  const doc = await Product.findById(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Product not found' })
  res.json(doc)
}

// GET /slug/:slug  (the product that has a variation with this slug)
async function getBySlug(req, res) {
  const doc = await Product.findOne({ 'variants.slug': req.params.slug })
  if (!doc) return res.status(404).json({ message: 'Product not found' })
  res.json(doc)
}

// POST /
async function create(req, res) {
  await checkCategoryPath(req.body)
  const doc = await Product.create(req.body)
  res.status(201).json(doc)
}

// PUT /:id
async function update(req, res) {
  const doc = await Product.findById(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Product not found' })
  await checkCategoryPath({ ...doc.toObject(), ...req.body })

  doc.set(req.body)
  await doc.save() // saving (not findByIdAndUpdate) keeps each variation's name and slug up to date
  res.json(doc)
}

// DELETE /:id
async function remove(req, res) {
  const doc = await Product.findByIdAndDelete(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Product not found' })
  res.json({ message: 'Product deleted', id: doc.id })
}


async function getCaratData(req, res) {
  const match = listFilter({ mainCategory: req.query.mainCategory, subCategory: req.query.subCategory, category: req.query.category })

  const values = (field) => [
    { $match: { [field]: { $nin: [null, ''] } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]
  const [result] = await Product.aggregate([
    { $match: match },
    { $unwind: '$variants' },
    {
      $facet: {
        carat: values('carat'),
      },
    },
  ])
  const pick = (rows) => rows.map((r) => ({ value: r._id, }))
  res.json({
    carat: pick(result.carat),
  })
}


async function suggestions(req, res) {
  const text = String(req.query.search ?? '').trim()
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5))
  if (!text) return res.json({ products: [], suggestions: [], collections: [] })

  const nameMatch = wordMatch(text)
  const lastWord = wordMatch(text.split(/\s+/).pop())

  const [products, names, categories] = await Promise.all([
    Product.aggregate([
      { $unwind: '$variants' },
      { $match: { 'variants.name': nameMatch } },
      { $sort: { _id: 1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          id: '$_id',
          name: '$variants.name',
          slug: '$variants.slug',
          productCode: '$variants.productCode',
          price: '$variants.price',
          image: { $arrayElemAt: ['$variants.images', 0] },
          mainCategory: 1,
          subCategory: 1,
        },
      },
    ]),
    Product.aggregate([
      { $match: { name: nameMatch } },
      { $group: { _id: { $toLower: '$name' }, count: { $sum: 1 } } },
    ]),
    Category.find({}, 'title slug subCategories').lean(),
  ])
  const counts = new Map()
  for (const { _id, count } of names) {
    const words = _id.split(/\s+/)
    const at = words.findIndex((w) => lastWord.test(w))
    if (at < 0) continue
    for (let back = 0; back <= 2 && back <= at; back++) {
      const phrase = words.slice(at - back, at + 1)
      if (phrase.some((w) => /\d/.test(w))) break
      const key = phrase.join(' ')
      if (!nameMatch.test(key)) continue
      counts.set(key, (counts.get(key) ?? 0) + count)
    }
  }
  const matches = [...counts].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length).map(([phrase]) => phrase)

  const collections = []
  const addCollection = (title, to) => nameMatch.test(title) && collections.push({ title, to })
  for (const main of categories) {
    addCollection(main.title, `/collections/${main.slug}`)
    for (const sub of main.subCategories) {
      addCollection(sub.title, `/collections/${slugify(sub.title)}`)
      for (const option of sub.options) addCollection(option.toLowerCase().includes(sub.title.toLowerCase()) ? option : `${option} ${sub.title}`, `/collections/${slugify(sub.title)}/${slugify(option)}`)
    }
  }

  res.json({
    products,
    suggestions: matches.slice(0, limit + 1),
    collections: collections.slice(0, limit),
  })
}

module.exports = { list, filters, getOne, getBySlug, create, update, remove, getCaratData, suggestions }
