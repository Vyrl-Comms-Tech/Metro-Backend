const Category = require('../models/Category')
const createCrudController = require('./crudController')

module.exports = createCrudController(Category, {
  searchFields: ['title'],
  sort: { order: 1, createdAt: 1 },
})
