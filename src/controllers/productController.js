const Product = require('../models/Product')
const { checkCategoryPath } = require('../utils/categoryPath')
const { paginate, search, pickFilters, listResponse } = require('../utils/query')

const FILTER_FIELDS = ['mainCategory', 'subCategory', 'category', 'type', 'metal', 'gemstone', 'shape', 'gender', 'pendantType']
// ?sort=az|za|priceAsc|priceDesc, anything else (best, new) is newest first; _id keeps pages stable
const SORTS = { az: ['name', 1], za: ['name', -1], priceAsc: ['price', 1], priceDesc: ['price', -1] }
function sortFor(sort, pricePath) {
  const [field, dir] = SORTS[sort] ?? ['createdAt', -1]
  return { [field === 'price' ? pricePath : field]: dir, _id: 1 }
}

const VARIANT_FILTERS = { type: 'variants.type', metal: 'variants.metal' }

// ?width=2&carat=1 style ranges: widthMin / widthMax, caratMin / caratMax
const RANGE_FIELDS = ['width', 'carat']

// every filter takes one value or several separated by commas (?metal=18k White Gold,Platinum)
function listFilter(query) {
  const filter = {}
  const params = { ...query, type: query.type ?? query.diamondType }
  for (const [key, value] of Object.entries(pickFilters(params, FILTER_FIELDS))) {
    const values = value.split(',').map((v) => v.trim()).filter(Boolean)
    filter[VARIANT_FILTERS[key] ?? key] = values.length > 1 ? { $in: values } : values[0]
  }
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

// the part of the filter that is about a variant (type, metal); it has to match the variation row itself, not just the product
const variantPart = (filter) => Object.fromEntries(Object.entries(filter).filter(([key]) => key.startsWith('variants.')))

// GET /getAll  ?page=1&limit=20&q=text&subCategory=...&diamondType=...&metal=...&shape=...&gemstone=...&pendantType=...
//   &widthMin=&widthMax=&caratMin=&caratMax=   ranges; any filter also takes several values separated by commas
//   &cardDetails=true    only what a product card needs (id, name, image, hoverImage, price, category fields), no variants or details
//   &sort=az|za|priceAsc|priceDesc   (default newest first)
//   &withVariation=true  one item per variation instead of one per product, and "total" counts the variations
async function list(req, res) {
  const paging = paginate(req.query)
  const filter = listFilter(req.query)
  if (req.query.q) Object.assign(filter, search(req.query.q, ['name']))
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

  res.json({
    ...listResponse(items, total, paging),
    totalProducts: products,
    totalVariants: variantBreakdown.reduce((n, g) => n + g.variants * g.products, 0), // every variant of the matching products
    variantBreakdown,
  })
}

async function filters(req, res) {
  const match = listFilter({ mainCategory: req.query.mainCategory, subCategory: req.query.subCategory, category: req.query.category })

  // counts are per variant (one row per type / metal combination), so they add up to totalVariants
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
        diamondType: values('variants.type'),
        category: values('category'),
        shape: values('shape'),
        metal: values('variants.metal'),
        gemstone: values('gemstone'),
        pendantType: values('pendantType'),
      },
    },
  ])
  const pick = (rows) => rows.map((r) => ({ value: r._id, count: r.count }))
  res.json({
    diamondType: pick(result.diamondType),
    category: pick(result.category),
    shape: pick(result.shape),
    metal: pick(result.metal),
    gemstone: pick(result.gemstone),
    pendantType: pick(result.pendantType),
  })
}

// GET /:id
async function getOne(req, res) {
  const doc = await Product.findById(req.params.id)
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
  const current = await Product.findById(req.params.id).lean()
  if (!current) return res.status(404).json({ message: 'Product not found' })
  await checkCategoryPath({ ...current, ...req.body })

  const doc = await Product.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: 'after',
    runValidators: true,
  })
  if (!doc) return res.status(404).json({ message: 'Product not found' })
  res.json(doc)
}

// DELETE /:id
async function remove(req, res) {
  const doc = await Product.findByIdAndDelete(req.params.id)
  if (!doc) return res.status(404).json({ message: 'Product not found' })
  res.json({ message: 'Product deleted', id: doc.id })
}

module.exports = { list, filters, getOne, create, update, remove }
