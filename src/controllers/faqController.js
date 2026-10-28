const Faq = require('../models/Faq')
const createCrudController = require('./crudController')

module.exports = createCrudController(Faq, {
  searchFields: ['question'],
  filterFields: ['category', 'featured'],
  sort: { order: 1, createdAt: 1 },
})
