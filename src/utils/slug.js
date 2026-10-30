const slugify = (text) =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  
async function uniqueSlug(Model, text, ignoreId) {
  const base = slugify(text) || 'item'
  let slug = base
  for (let n = 2; await Model.exists({ slug, ...(ignoreId && { _id: { $ne: ignoreId } }) }); n++) {
    slug = `${base}-${n}`
  }
  return slug
}

module.exports = { slugify, uniqueSlug }
