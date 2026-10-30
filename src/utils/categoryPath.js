const Category = require('../models/Category')
const AppError = require('./AppError')

// checks mainCategory > subCategory > category against the Categories page,
// e.g. jewellery > Rings > Plain
async function checkCategoryPath({ mainCategory, subCategory, category }) {
  const main = await Category.findOne({ slug: mainCategory }).lean()
  if (!main) throw new AppError(`Unknown category "${mainCategory}"`, 400)

  if (!main.subCategories.length) {
    if (subCategory || category) throw new AppError(`"${main.title}" has no subcategories`, 400)
    return
  }

  const sub = main.subCategories.find((s) => s.title === subCategory)
  if (!sub) throw new AppError(`"${subCategory || ''}" is not a subcategory of ${main.title}`, 400)

  if (category && sub.options.length && !sub.options.includes(category)) {
    throw new AppError(`"${category}" is not an option of ${sub.title}`, 400)
  }
}

module.exports = { checkCategoryPath }
