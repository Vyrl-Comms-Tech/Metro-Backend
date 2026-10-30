const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ?page=1&limit=20 -> { page, limit, skip }
function paginate(query) {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(500, Math.max(1, Number(query.limit) || 20))
  return { page, limit, skip: (page - 1) * limit }
}

// builds a case-insensitive "contains" match on the given fields
function search(text, fields) {
  const pattern = new RegExp(escapeRegex(String(text)), 'i')
  return { $or: fields.map((field) => ({ [field]: pattern })) }
}

// copies ?field=value into a filter for the allowed fields only
function pickFilters(query, fields) {
  const filter = {}
  for (const field of fields) {
    if (query[field]) filter[field] = String(query[field])
  }
  return filter
}

const listResponse = (items, total, { page, limit }) => {
  const pages = Math.max(1, Math.ceil(total / limit))
  return { items, total, page, pages, hasNext: page < pages, hasPrev: page > 1 }
}

module.exports = { paginate, search, pickFilters, listResponse }
